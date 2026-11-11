import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as adminLogin } from "@/app/api/admin/auth/route";
import { POST as createSession } from "@/app/api/auth/session/route";
import { GET as health } from "@/app/api/health/route";
import { healthCheckResponseSchema } from "@/lib/health";
import { POST as resetInvestments } from "@/app/api/admin/reset-investments/route";
import { POST as updateSettings } from "@/app/api/admin/settings/route";
import { GET as publicResults } from "@/app/api/public/results/route";
import { isRevert, isSkip, transitionProblem } from "@/lib/state-machine";
import { publicResultsSchema, type PublicResults } from "@/types/results";
import type { CompetitionStatus } from "@/types/competition";
import { startLocalDatabase, type LocalDatabase } from "../db/local-postgres";
import { startPostgrestShim, type PostgrestShim } from "../db/postgrest-shim";

let db: LocalDatabase;
let shim: PostgrestShim;
let admin: string;

const PASSWORD = "test-only-admin-password";

beforeAll(async () => {
  db = await startLocalDatabase();
  shim = await startPostgrestShim(db);
  process.env.NEXT_PUBLIC_SUPABASE_URL = shim.url;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = shim.anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = shim.serviceKey;
  process.env.ADMIN_PASSWORD = PASSWORD;
  process.env.SESSION_SECRET = "test-only-session-secret-0123456789abcdef";
}, 180_000);

afterAll(async () => {
  await shim?.stop();
  await db?.stop();
}, 60_000);

function request(path: string, body: unknown, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

const setSettings = (patch: unknown, cookie: string = admin) =>
  updateSettings(request("/api/admin/settings", patch, cookie));

async function forceStatus(status: CompetitionStatus) {
  await db.admin.query("update public.settings set status = $1, reveal_step = 0", [status]);
}

async function currentStatus(): Promise<string> {
  return (await db.admin.query<{ status: string }>("select status from public.settings")).rows[0].status;
}

async function results(): Promise<{ response: Response; data: PublicResults; text: string }> {
  const response = await publicResults();
  const text = await response.text();
  return { response, text, data: publicResultsSchema.parse(JSON.parse(text).data) };
}

beforeEach(async () => {
  shim.broadcasts.length = 0;
  shim.failBroadcasts = false;
  await db.admin.query(`
    delete from public.investments;
    delete from public.investors;
    delete from public.teams;
    update public.settings set status = 'open', reveal_step = 0, current_pitch_team_id = null, show_live_totals = false;

    insert into public.teams (team_no, company_name, leader_name, phone, description) values
      (1, '큐네스티', '홍길동', '01010000001', '행사 운영'),
      (2, '그린루프', '김하늘', '01010000002', '재활용'),
      (3, '메디브릿지', '박서준', '01010000003', '진료 예약'),
      (4, '로컬테이블', '이수민', '01010000004', '식자재');
    insert into public.investors (investor_no, investor_name, phone, investor_type, team_id)
      select team_no, leader_name, phone, 'founder', id from public.teams;
    insert into public.investors (investor_no, investor_name, phone, investor_type)
      values (101, '김심사', '01099990101', 'external');
  `);
  // 유치액: 3번 8억(2건, 외부 5) / 2번 8억(2건, 외부 0) / 4번 2억 / 1번 0. 1번에는 수동 순위 2위.
  const invest = (investor: number, team: number, units: number) =>
    db.as("service_role").query(
      `select public.set_investment((select id from public.investors where investor_no = $1),
         (select id from public.teams where team_no = $2), $3)`,
      [investor, team, units],
    );
  await invest(101, 3, 5);
  await invest(1, 3, 3);
  await invest(1, 2, 5);
  await invest(3, 2, 3);
  await invest(2, 4, 2);
  await db.admin.query("update public.teams set manual_rank_override = 2 where team_no = 1");

  const login = await adminLogin(request("/api/admin/auth", { password: PASSWORD }));
  admin = /jumpup_admin_session=[^;]+/.exec(login.headers.get("set-cookie") ?? "")?.[0] ?? "";
});

describe("단계 전환 규칙", () => {
  it("바로 다음 단계와 이전 단계만 허용하고, 투자 오픈 이후의 되돌리기는 확인을 요구한다", () => {
    expect(transitionProblem("ready", "pitching", false)).toBeNull();
    expect(transitionProblem("pitching", "ready", false)).toBeNull();
    expect(transitionProblem("pitching", "open", false)).toBeNull();
    expect(transitionProblem("open", "closed", false)).toBeNull();
    expect(transitionProblem("closed", "revealed", false)).toBeNull();
    expect(transitionProblem("open", "open", false)).toBeNull();

    expect(isSkip("ready", "open")).toBe(true);
    expect(isSkip("open", "revealed")).toBe(true);
    expect(transitionProblem("open", "revealed", true)).toContain("건너뛸 수 없습니다");

    expect(isRevert("open", "pitching")).toBe(true);
    expect(isRevert("revealed", "ready")).toBe(true);
    expect(isRevert("pitching", "ready")).toBe(false);
    expect(transitionProblem("closed", "open", false)).toContain("확인이 필요합니다");
    expect(transitionProblem("closed", "open", true)).toBeNull();
  });
});

describe("GET /api/public/results — 결과 공개 전 마스킹", () => {
  it.each(["ready", "pitching", "open", "closed"] as const)(
    "%s: 집계 필드는 모두 0이고 기업 번호순이며, 수동 순위 여부도 드러나지 않는다",
    async (status) => {
      await forceStatus(status);
      const { response, data, text } = await results();

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store, no-cache, max-age=0, must-revalidate");
      expect(data.status).toBe(status);
      expect(data.results.map((team) => team.team_no)).toEqual([1, 2, 3, 4]);
      for (const team of data.results) {
        expect(team).toMatchObject({
          total_raised_units: 0,
          investor_count: 0,
          external_raised_units: 0,
          final_rank: 0,
          is_override: false,
        });
      }
      // 실제 집계값(8, 5, 2)이나 연락처, 수동 순위가 응답 어디에도 없어야 한다.
      expect(text).not.toMatch(/"(total_raised_units|investor_count|external_raised_units|final_rank)":[1-9]/);
      expect(text).not.toMatch(/phone|0101000|manual_rank_override|note/);
    },
  );

  it("공개 전에는 투자 집계 함수와 investments를 조회하지 않는다", async () => {
    await forceStatus("closed");
    // 집계 경로를 막아도 공개 전 응답은 정상이어야 한다(= 그 경로를 타지 않는다).
    await db.admin.query("revoke execute on function public.admin_dashboard_data() from service_role");
    try {
      expect((await publicResults()).status).toBe(200);
      await forceStatus("revealed");
      expect((await publicResults()).status).toBe(503);
    } finally {
      await db.admin.query("grant execute on function public.admin_dashboard_data() to service_role");
    }
  });

  it("revealed: 실제 집계와 순위(수동 보정 반영)를 돌려준다", async () => {
    await forceStatus("revealed");
    const { data, text } = await results();

    expect(data.results.map((team) => [team.final_rank, team.team_no, team.total_raised_units, team.investor_count, team.external_raised_units, team.is_override])).toEqual([
      [1, 3, 8, 2, 5, false], // 8억 동점: 투자자 수 같음 → 외부 유치액이 큰 3번이 앞
      [2, 1, 0, 0, 0, true], // 수동 순위 2위
      [3, 2, 8, 2, 0, false],
      [4, 4, 2, 1, 0, false],
    ]);
    expect(text).not.toMatch(/phone|0101000/);
  });
});

describe("POST /api/admin/settings — 검증과 알림", () => {
  it("관리자 쿠키가 없거나 무효면 401이고 설정이 바뀌지 않으며 알림도 나가지 않는다", async () => {
    for (const cookie of ["", "jumpup_admin_session=forged.value"]) {
      const response = await updateSettings(request("/api/admin/settings", { status: "closed" }, cookie));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ success: false, error: "관리자 로그인이 필요합니다." });
    }
    expect(await currentStatus()).toBe("open");
    expect(shim.broadcasts).toEqual([]);
  });

  it("전환에 성공하면 no-store로 응답하고 state_change 알림을 보낸다", async () => {
    const response = await setSettings({ status: "closed" });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");

    const body = await response.json();
    expect(body.realtime).toBe("sent");
    expect(body.data).toMatchObject({ status: "closed", reveal_step: 0, show_live_totals: false, current_pitch_team_id: null });

    expect(shim.broadcasts).toHaveLength(1);
    expect(shim.broadcasts[0]).toMatchObject({ topic: "jumpup_public_display", event: "state_change" });
    expect(JSON.stringify(shim.broadcasts[0].payload)).toContain('"status":"closed"');
  });

  it("단계를 건너뛰는 전환은 400으로 거절한다", async () => {
    const response = await setSettings({ status: "revealed" });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(
      "'투자 오픈'에서 '결과 공개'(으)로 건너뛸 수 없습니다. 먼저 '투자 마감' 단계로 전환해 주세요.",
    );
    expect(await currentStatus()).toBe("open");
    expect(shim.broadcasts).toEqual([]);
  });

  it("투자 오픈 이후의 되돌리기는 확인 표시가 있을 때만 허용한다", async () => {
    await forceStatus("revealed");
    const refused = await setSettings({ status: "open" });
    expect(refused.status).toBe(400);
    expect(await currentStatus()).toBe("revealed");

    const allowed = await setSettings({ status: "open", confirm_revert: true });
    expect(allowed.status).toBe(200);
    expect(await currentStatus()).toBe("open");
  });

  it("시상 단계는 결과 공개에서만 바뀌고, 다른 단계에서는 0으로 유지된다", async () => {
    expect((await setSettings({ reveal_step: 1 })).status).toBe(400);
    await setSettings({ status: "closed" });
    await setSettings({ status: "revealed" });
    expect((await (await setSettings({ reveal_step: 4 })).json()).data.reveal_step).toBe(4);
    expect((await (await setSettings({ status: "closed", confirm_revert: true })).json()).data.reveal_step).toBe(0);
  });

  it("알림 전송이 실패해도 변경은 저장되고, 응답이 그 사실을 알린다", async () => {
    shim.failBroadcasts = true;
    const response = await setSettings({ status: "closed" });
    expect(response.status).toBe(200);
    expect((await response.json()).realtime).toBe("failed");
    expect(await currentStatus()).toBe("closed");
  });

  it("리허설 초기화도 reset 표시와 함께 알림을 보낸다", async () => {
    const response = await resetInvestments(request("/api/admin/reset-investments", { confirmation: "초기화 실행" }, admin));
    expect(response.status).toBe(200);
    expect(shim.broadcasts).toHaveLength(1);
    expect(shim.broadcasts[0].event).toBe("state_change");
    const payload = JSON.stringify(shim.broadcasts[0].payload);
    expect(payload).toContain('"status":"ready"');
    expect(payload).toContain('"reset":true');
  });
});

describe("GET /api/health", () => {
  it("DB에 닿으면 200, status ok, db connected를 돌려준다", async () => {
    const response = await health();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate");
    const body = healthCheckResponseSchema.parse(await response.json());
    expect(body).toMatchObject({ status: "ok", db: "connected", env: "test" });
  });

  it("DB 조회가 실패하면 503, degraded, disconnected이고 내부 오류 내용은 싣지 않는다", async () => {
    await db.admin.query("revoke select on public.settings from anon");
    try {
      const response = await health();
      expect(response.status).toBe(503);
      const text = await response.text();
      expect(healthCheckResponseSchema.parse(JSON.parse(text))).toMatchObject({
        status: "degraded",
        db: "disconnected",
      });
      expect(text).not.toMatch(/permission|settings|supabase|127\.0\.0\.1/i);
    } finally {
      await db.admin.query("grant select on public.settings to anon");
    }
  });

  it("DB 접속 정보가 없어도 예외 없이 503을 돌려준다", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    try {
      const response = await health();
      expect(response.status).toBe(503);
      expect((await response.json()).db).toBe("disconnected");
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    }
  });
});

describe("프로덕션 쿠키 속성", () => {
  it("프로덕션에서는 참가자·관리자 세션 쿠키에 Secure가 붙는다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const adminResponse = await adminLogin(request("/api/admin/auth", { password: PASSWORD }));
      const adminCookie = adminResponse.headers.get("set-cookie") ?? "";
      expect(adminCookie).toMatch(/Secure/i);
      expect(adminCookie).toMatch(/HttpOnly/i);
      expect(adminCookie).toMatch(/SameSite=strict/i);

      const participantResponse = await createSession(
        request("/api/auth/session", { method: "phone", phone: "01099990101" }),
      );
      const participantCookie = participantResponse.headers.get("set-cookie") ?? "";
      expect(participantCookie).toMatch(/Secure/i);
      expect(participantCookie).toMatch(/HttpOnly/i);
      expect(participantCookie).toMatch(/SameSite=lax/i);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
