import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as adminLogout } from "@/app/api/admin/auth/logout/route";
import { POST as adminLogin } from "@/app/api/admin/auth/route";
import { POST as bulkRegister } from "@/app/api/admin/bulk-register/route";
import { GET as dashboard } from "@/app/api/admin/dashboard/route";
import { GET as exportCsv } from "@/app/api/admin/export-csv/route";
import { POST as resetInvestments } from "@/app/api/admin/reset-investments/route";
import { POST as updateSettings } from "@/app/api/admin/settings/route";
import { PATCH as overrideRank } from "@/app/api/admin/teams/[id]/override-rank/route";
import { POST as createSession } from "@/app/api/auth/session/route";
import { GET as publicState } from "@/app/api/public/state/route";
import { parseBulkText } from "@/lib/bulk-parse";
import type { AdminDashboard } from "@/types/admin";
import { startLocalDatabase, type LocalDatabase } from "../db/local-postgres";
import { startPostgrestShim, type PostgrestShim } from "../db/postgrest-shim";

let db: LocalDatabase;
let shim: PostgrestShim;
let admin: string; // 관리자 세션 쿠키 ("이름=값")

const PASSWORD = "test-only-admin-password";

// 12개 기업 + 3명 외부 심사위원
const ROSTER = [
  "순번\t기업명\t대표자명\t전화번호\t아이템 소개\t비고",
  ...Array.from({ length: 12 }, (_, i) => {
    const no = i + 1;
    return `${no}\t기업 ${no}\t대표 ${no}\t010-1000-${String(no).padStart(4, "0")}\t아이템 ${no}\t`;
  }),
  "101\t\t김심사\t010-9999-0101\t\t심사위원",
  "102\t창업지원센터\t이멘토\t010-9999-0102\t\t멘토",
  "103\t\t박센터\t010-9999-0103\t\t",
].join("\n");

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

beforeEach(async () => {
  await db.admin.query(`
    delete from public.investments;
    delete from public.investors;
    delete from public.teams;
    update public.settings set status = 'ready', reveal_step = 0, current_pitch_team_id = null,
      budget_units = 10, show_live_totals = false;
  `);
  admin = cookieOf(await adminLogin(request("POST", "/api/admin/auth", { password: PASSWORD })));
});

function request(method: string, path: string, body?: unknown, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function cookieOf(response: Response): string {
  const match = /jumpup_(admin_)?session=[^;]+/.exec(response.headers.get("set-cookie") ?? "");
  if (!match) throw new Error("세션 쿠키가 발급되지 않았습니다.");
  return match[0];
}

/** 붙여넣은 텍스트를 화면과 같은 방식으로 행 배열로 바꿔 등록 API에 보낸다(오류가 있는 행도 그대로 보낸다). */
const register = (text: string, cookie = admin) =>
  registerRows(
    parseBulkText(text).rows.map((row) => ({
      no: row.no ?? Number.NaN,
      company_name: row.company_name,
      leader_name: row.leader_name,
      phone: row.phone_input,
      description: row.description,
      note: row.note,
    })),
    cookie,
  );

const registerRows = (rows: unknown, cookie = admin) =>
  bulkRegister(request("POST", "/api/admin/bulk-register", { rows }, cookie));

async function getDashboard(): Promise<AdminDashboard> {
  const response = await dashboard(request("GET", "/api/admin/dashboard", undefined, admin));
  expect(response.status).toBe(200);
  return (await response.json()).data;
}

const setSettings = (patch: unknown, cookie = admin) =>
  updateSettings(request("POST", "/api/admin/settings", patch, cookie));

/** 테스트 준비용: 전환 규칙을 거치지 않고 단계를 바로 바꾼다. */
async function forceStatus(status: string) {
  await db.admin.query("update public.settings set status = $1, reveal_step = 0", [status]);
}

/** 번호로 지정한 투자자가 번호로 지정한 기업에 units억을 넣는다(DB 함수 직접 호출). */
async function invest(investorNo: number, teamNo: number, units: number) {
  await db.as("service_role").query(
    `select public.set_investment(
       (select id from public.investors where investor_no = $1),
       (select id from public.teams where team_no = $2), $3)`,
    [investorNo, teamNo, units],
  );
}

describe("관리자 인증", () => {
  it("틀린 비밀번호는 401이고 쿠키를 주지 않는다", async () => {
    const response = await adminLogin(request("POST", "/api/admin/auth", { password: "wrong" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, error: "비밀번호가 일치하지 않습니다." });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("맞는 비밀번호는 HttpOnly·SameSite=Strict 쿠키를 12시간 발급한다", async () => {
    const response = await adminLogin(request("POST", "/api/admin/auth", { password: PASSWORD }));
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^jumpup_admin_session=[^;]+;/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=strict/i);
    expect(cookie).toMatch(/Max-Age=43200/);
  });

  it("로그아웃은 쿠키를 만료시킨다", () => {
    expect(adminLogout().headers.get("set-cookie")).toMatch(/jumpup_admin_session=;.*Max-Age=0/i);
  });

  it("관리자 쿠키가 없거나, 변조되었거나, 참가자 쿠키면 모든 관리자 API가 401이다", async () => {
    await register(ROSTER);
    const participant = cookieOf(
      await createSession(request("POST", "/api/auth/session", { method: "phone", phone: "01010000001" })),
    );
    const teamId = (await db.admin.query<{ id: string }>("select id from public.teams limit 1")).rows[0].id;

    // 빈 문자열은 "쿠키 없음"이다(undefined를 넘기면 도우미의 기본값인 관리자 쿠키가 쓰인다).
    for (const cookie of ["", "jumpup_admin_session=forged.value", participant, participant.replace("jumpup_session", "jumpup_admin_session")]) {
      const responses = await Promise.all([
        dashboard(request("GET", "/api/admin/dashboard", undefined, cookie)),
        setSettings({ status: "revealed" }, cookie),
        register("50\t침입\t침입자\t01088887777", cookie),
        overrideRank(request("PATCH", `/api/admin/teams/${teamId}/override-rank`, { manual_rank_override: 1 }, cookie), { params: { id: teamId } }),
        resetInvestments(request("POST", "/api/admin/reset-investments", { confirmation: "초기화 실행" }, cookie)),
        exportCsv(request("GET", "/api/admin/export-csv", undefined, cookie)),
      ]);
      expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401, 401]);
    }

    const state = await db.admin.query("select status from public.settings");
    expect(state.rows).toEqual([{ status: "ready" }]);
    expect((await db.admin.query("select 1 from public.teams where team_no = 50")).rowCount).toBe(0);
  });
});

describe("일괄 등록", () => {
  it("12개 기업과 15명 투자자를 등록하고 외부 심사위원을 구분한다", async () => {
    const response = await register(ROSTER);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { registered_teams_count: 12, registered_investors_count: 15 },
    });

    const data = await getDashboard();
    expect(data.teams).toHaveLength(12);
    expect(data.investors).toHaveLength(15);
    expect(data.investors.find((i) => i.investor_no === 1)).toMatchObject({
      investor_name: "대표 1",
      investor_type: "founder",
      phone: "01010000001",
      remaining_units: 10,
    });
    expect(data.investors.filter((i) => i.investor_type === "external").map((i) => i.investor_no)).toEqual([101, 102, 103]);
    expect(data.investors.find((i) => i.investor_no === 1)?.team_id).toBe(data.teams.find((t) => t.team_no === 1)?.id);
  });

  it("형식 오류나 중복이 있으면 행 번호와 함께 거절하고 아무것도 등록하지 않는다", async () => {
    const response = await register(["1\t큐네스티\t홍길동\t01012345678", "2\t그린루프\t김하늘\t010-12", "1\t중복\t박서준\t01033334444"].join("\n"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("[행 1] 순번 1 중복 감지 (행 1, 3)");
    expect(body.row_errors).toEqual([
      { line: 1, errors: ["순번 1 중복 감지 (행 1, 3)"] },
      { line: 2, errors: ["유효하지 않은 전화번호입니다 (숫자 10~11자리 필요)."] },
      { line: 3, errors: ["순번 1 중복 감지 (행 1, 3)"] },
    ]);
    expect((await db.admin.query("select 1 from public.teams")).rowCount).toBe(0);
  });

  it("이미 등록된 다른 번호와 전화번호가 겹치면 전체를 취소한다", async () => {
    await register(ROSTER);
    const response = await register(["20\t새기업\t새대표\t01055550020", "21\t겹침\t겹대표\t010-1000-0003"].join("\n"));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("2행: 전화번호 01010000003는 이미 3번 기업에 등록되어 있습니다.");
    expect((await db.admin.query("select 1 from public.teams where team_no in (20, 21)")).rowCount).toBe(0);
  });

  const row = (no: number, phone: string, company = "기업", leader = "이름") => ({
    no,
    company_name: company,
    leader_name: leader,
    phone,
    description: "",
    note: "",
  });

  it("기업 2개와 외부 심사위원 1명을 보내면 teams 2건, investors 3건이 생긴다", async () => {
    const response = await registerRows([
      row(1, "010-1111-0001", "큐네스티", "홍길동"),
      row(2, "010 1111 0002", "그린루프", "김하늘"),
      row(101, "01011110101", "", "김심사"),
    ]);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ registered_teams_count: 2, registered_investors_count: 3 });

    const stored = await db.admin.query(
      "select investor_no, investor_type, phone, team_id is not null as has_team from public.investors order by investor_no",
    );
    expect(stored.rows).toEqual([
      { investor_no: 1, investor_type: "founder", phone: "01011110001", has_team: true },
      { investor_no: 2, investor_type: "founder", phone: "01011110002", has_team: true },
      { investor_no: 101, investor_type: "external", phone: "01011110101", has_team: false },
    ]);
  });

  it.each([
    ["순번 100", row(100, "01011110100"), "[행 2] 순번 100번은 예약 번호로 사용할 수 없습니다."],
    ["순번 0", row(0, "01011110100"), "[행 2] 순번은 1 이상의 정수여야 합니다."],
    ["소수 순번", row(1.5, "01011110100"), "[행 2] 순번은 1 이상의 정수여야 합니다."],
    ["기업명 없는 기업", row(3, "01011110100", " "), "[행 2] 1~99번 기업은 기업명이 필수입니다."],
    ["이름 없음", row(102, "01011110100", "", ""), "[행 2] 대표자/심사자 성명은 필수입니다."],
    ["01로 시작하지 않는 번호", row(3, "02-1234-5678"), "[행 2] 유효하지 않은 전화번호입니다 (숫자 10~11자리 필요)."],
  ])("%s이(가) 섞여 있으면 400이고 다른 정상 행도 저장되지 않는다", async (_name, bad, message) => {
    const response = await registerRows([row(1, "01011110001"), bad]);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(message);
    expect((await db.admin.query("select 1 from public.teams")).rowCount).toBe(0);
    expect((await db.admin.query("select 1 from public.investors")).rowCount).toBe(0);
  });

  it("빈 배열, 100행 초과, 잘못된 모양의 요청을 거절한다", async () => {
    expect((await registerRows([])).status).toBe(400);
    const many = Array.from({ length: 101 }, (_, i) => row(101 + i, `0102222${String(i).padStart(4, "0")}`, "", "심사"));
    expect((await registerRows(many)).status).toBe(400);
    expect((await registerRows("not an array")).status).toBe(400);
    expect((await registerRows([{ no: "1", phone: "01011110001" }])).status).toBe(400);
    expect((await db.admin.query("select 1 from public.investors")).rowCount).toBe(0);
  });

  it("외부 심사위원 100명을 한 번에 등록할 수 있다", async () => {
    const hundred = Array.from({ length: 100 }, (_, i) => row(101 + i, `0103333${String(i).padStart(4, "0")}`, "", `심사${i}`));
    const response = await registerRows(hundred);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ registered_teams_count: 0, registered_investors_count: 100 });
  });

  it("다시 등록해도 기업과 투자자의 고유 ID는 바뀌지 않는다", async () => {
    await registerRows([row(1, "01011110001", "큐네스티", "홍길동")]);
    const ids = () =>
      db.admin.query("select (select id from public.teams where team_no = 1) as team, (select id from public.investors where investor_no = 1) as investor");
    const before = (await ids()).rows[0];
    await registerRows([row(1, "01011119999", "큐네스티 주식회사", "홍길순")]);
    expect((await ids()).rows[0]).toEqual(before);
    const updated = await db.admin.query("select company_name, phone from public.teams where team_no = 1");
    expect(updated.rows).toEqual([{ company_name: "큐네스티 주식회사", phone: "01011119999" }]);
  });

  it("같은 번호를 다시 올리면 내용을 갱신하고 투자 내역은 유지한다", async () => {
    await register(ROSTER);
    await forceStatus("open");
    await invest(101, 1, 4);
    const response = await register("1\t큐네스티(변경)\t홍길동\t010-1000-0001\t새 소개\t");
    expect(response.status).toBe(200);
    const data = await getDashboard();
    expect(data.teams).toHaveLength(12);
    expect(data.teams.find((t) => t.team_no === 1)).toMatchObject({ company_name: "큐네스티(변경)", total_raised_units: 4 });
  });
});

describe("대회 진행 제어", () => {
  beforeEach(async () => {
    await register(ROSTER);
  });

  it("단계와 발표 기업을 바꾸면 공개 상태 API에 바로 반영된다", async () => {
    const teamId = (await getDashboard()).teams.find((t) => t.team_no === 3)?.id;
    const response = await setSettings({ status: "pitching", current_pitch_team_id: teamId });
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ status: "pitching", current_pitch_team_id: teamId, reveal_step: 0 });

    const state = (await (await publicState()).json()).data;
    expect(state.status).toBe("pitching");
    expect(state.current_pitch_team).toMatchObject({ team_no: 3, company_name: "기업 3" });

    await setSettings({ status: "open" });
    expect((await (await publicState()).json()).data.status).toBe("open");
  });

  it("시상 단계는 결과 공개에서만 바꿀 수 있고, 단계를 옮기면 0으로 돌아간다", async () => {
    const early = await setSettings({ reveal_step: 2 });
    expect(early.status).toBe(400);
    expect((await early.json()).error).toBe("시상 단계는 결과 공개 상태에서만 바꿀 수 있습니다.");

    await forceStatus("closed");
    await setSettings({ status: "revealed" });
    expect((await (await setSettings({ reveal_step: 3 })).json()).data.reveal_step).toBe(3);
    expect((await (await setSettings({ status: "closed", confirm_revert: true })).json()).data.reveal_step).toBe(0);
  });

  it("잘못된 값과 없는 기업을 거절한다", async () => {
    expect((await setSettings({ status: "paused" })).status).toBe(400);
    expect((await setSettings({ reveal_step: 7 })).status).toBe(400);
    expect((await setSettings({})).status).toBe(400);
    expect((await setSettings({ budget_units: 100 })).status).toBe(400);
    const missing = await setSettings({ current_pitch_team_id: "00000000-0000-4000-8000-000000000000" });
    expect(missing.status).toBe(400);
    expect((await missing.json()).error).toBe("선택한 발표 기업을 찾을 수 없습니다.");
  });
});

describe("집계, 순위, 내보내기, 초기화", () => {
  beforeEach(async () => {
    await register(ROSTER);
    await forceStatus("open");
    // 1번: 5억(2건, 외부 0) / 2번: 5억(2건, 외부 3) / 3번: 6억(1건) / 4번: 5억(1건)
    await invest(2, 1, 2);
    await invest(3, 1, 3);
    await invest(101, 2, 3);
    await invest(1, 2, 2);
    await invest(102, 3, 6);
    await invest(1, 4, 5);
  });

  it("참여율·총액·투자자별 잔여와 자동 순위를 집계한다", async () => {
    const data = await getDashboard();
    expect(data.summary).toEqual({
      total_investors: 15,
      participated_investors: 5,
      participation_rate: 33.3,
      total_invested_units: 21,
    });
    expect(data.investors.find((i) => i.investor_no === 1)).toMatchObject({ allocated_units: 7, remaining_units: 3, is_submitted: false });
    expect(data.investors.find((i) => i.investor_no === 4)).toMatchObject({ allocated_units: 0, remaining_units: 10 });

    // 유치액 → 투자자 수 → 외부 유치액 → 기업 번호
    expect(data.teams.slice(0, 4).map((t) => [t.team_no, t.total_raised_units, t.investor_count, t.external_raised_units, t.calculated_rank])).toEqual([
      [3, 6, 1, 6, 1],
      [2, 5, 2, 3, 2],
      [1, 5, 2, 0, 3],
      [4, 5, 1, 0, 4],
    ]);
  });

  it("수동 순위를 저장하면 최종 순위가 바뀌고, 해제하면 돌아온다", async () => {
    const team1 = (await getDashboard()).teams.find((t) => t.team_no === 1);
    if (!team1) throw new Error("1번 기업이 없습니다.");
    const patch = (rank: unknown, id = team1.id) =>
      overrideRank(request("PATCH", `/api/admin/teams/${id}/override-rank`, { manual_rank_override: rank }, admin), { params: { id } });

    expect((await patch(1)).status).toBe(200);
    let teams = (await getDashboard()).teams;
    expect(teams.slice(0, 3).map((t) => [t.team_no, t.final_rank])).toEqual([[1, 1], [3, 2], [2, 3]]);
    expect(teams[0]).toMatchObject({ calculated_rank: 3, manual_rank_override: 1 });

    expect((await patch(null)).status).toBe(200);
    teams = (await getDashboard()).teams;
    expect(teams[0].team_no).toBe(3);

    expect((await patch(0)).status).toBe(400);
    expect((await patch(1.5)).status).toBe(400);
    expect((await patch(1, "not-a-uuid")).status).toBe(400);
    expect((await patch(1, "00000000-0000-4000-8000-000000000000")).status).toBe(404);
  });

  it("CSV는 BOM으로 시작하고 순위표와 투자 매트릭스를 담는다", async () => {
    const response = await exportCsv(request("GET", "/api/admin/export-csv", undefined, admin));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="jumpup_ir_results_\d{8}_\d{4}\.csv"$/);

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);

    const lines = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes).slice(1).split("\r\n");
    expect(lines[2]).toBe("1,3,기업 3,대표 3,6,1,6,N");
    expect(lines[3]).toBe("2,2,기업 2,대표 2,5,2,3,N");
    expect(lines).toContain("1,대표 1,기업 1,0,2,0,5,0,0,0,0,0,0,0,0,7");
    expect(lines).toContain("102,이멘토,외부 투자자,0,0,6,0,0,0,0,0,0,0,0,0,6");
  });

  it("초기화는 확인 문구가 정확할 때만 실행되고 명단은 보존한다", async () => {
    const reset = (confirmation: unknown) =>
      resetInvestments(request("POST", "/api/admin/reset-investments", { confirmation }, admin));

    expect((await reset("초기화")).status).toBe(400);
    expect((await reset(undefined)).status).toBe(400);
    expect((await db.admin.query("select 1 from public.investments")).rowCount).toBe(6);

    await db.admin.query("update public.teams set manual_rank_override = 1 where team_no = 4");
    const response = await reset("초기화 실행");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, message: "투자 데이터가 초기화되었습니다.", realtime: "sent" });

    const data = await getDashboard();
    expect(data.settings.status).toBe("ready");
    expect(data.summary.total_invested_units).toBe(0);
    expect(data.teams).toHaveLength(12);
    expect(data.investors).toHaveLength(15);
    // 리허설 때 넣은 수동 순위가 본 행사에 남지 않는다.
    expect(data.teams.every((team) => team.manual_rank_override === null)).toBe(true);
  });
});

describe("데이터가 없을 때", () => {
  it("대시보드는 빈 목록과 0%를 돌려준다", async () => {
    const data = await getDashboard();
    expect(data.teams).toEqual([]);
    expect(data.investors).toEqual([]);
    expect(data.summary).toEqual({ total_investors: 0, participated_investors: 0, participation_rate: 0, total_invested_units: 0 });
  });
});
