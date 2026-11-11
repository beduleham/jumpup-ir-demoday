import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as createSession } from "@/app/api/auth/session/route";
import { startLocalDatabase, type LocalDatabase } from "../db/local-postgres";
import { startPostgrestShim, type PostgrestShim } from "../db/postgrest-shim";

// 라우트 핸들러 → supabase-js → (PostgREST 흉내) → 실제 로컬 Postgres 경로를 통째로 검증한다.

let db: LocalDatabase;
let shim: PostgrestShim;
let teams: string[]; // team_no 1..3 순서
let founder: string; // 1번 대표(1번 기업 소속)
let external: string; // 101번 외부 심사위원

const FOUNDER_PHONE = "01012345678";
const VALID_TOKEN = "valid-token-0123456789abcdefghijklmnop";
const USED_TOKEN = "used-token-0123456789abcdefghijklmnopq";
const EXPIRED_TOKEN = "expired-token-0123456789abcdefghijklm";

beforeAll(async () => {
  db = await startLocalDatabase();
  shim = await startPostgrestShim(db);
  process.env.NEXT_PUBLIC_SUPABASE_URL = shim.url;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = shim.anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = shim.serviceKey;
  process.env.ADMIN_PASSWORD = "test-only-admin-password";
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
    update public.settings set status = 'open', budget_units = 10, max_units_per_team = 0;
  `);
  const teamRows = await db.admin.query<{ id: string }>(`
    insert into public.teams (team_no, company_name, leader_name, phone) values
      (1, '큐네스티', '홍길동', '${FOUNDER_PHONE}'),
      (2, '그린루프', '김하늘', '01022223333'),
      (3, '메디브릿지', '박서준', '01033334444')
    returning id
  `);
  teams = teamRows.rows.map((row) => row.id);
  const investorRows = await db.admin.query<{ id: string }>(
    `insert into public.investors (investor_no, investor_name, phone, investor_type, team_id) values
       (1, '홍길동', '${FOUNDER_PHONE}', 'founder', $1),
       (101, '김심사', '01099990101', 'external', null)
     returning id`,
    [teams[0]],
  );
  [founder, external] = investorRows.rows.map((row) => row.id);
  await db.admin.query(
    `insert into public.invitation_tokens (token, investor_id, expires_at, used_at) values
       ($1, $4, now() + interval '1 hour', null),
       ($2, $4, now() + interval '1 hour', now()),
       ($3, $4, now() - interval '1 minute', null)`,
    [VALID_TOKEN, USED_TOKEN, EXPIRED_TOKEN, external],
  );
});

function post(path: string, body: unknown, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function get(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : {} });
}

/** 응답의 Set-Cookie에서 다음 요청에 보낼 "이름=값"만 꺼낸다. */
function sessionCookieOf(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  const match = /jumpup_session=[^;]+/.exec(header);
  if (!match) throw new Error("세션 쿠키가 발급되지 않았습니다.");
  return match[0];
}

async function loginByPhone(phone: string) {
  return createSession(post("/api/auth/session", { method: "phone", phone }));
}

describe("POST /api/auth/session — 전화번호", () => {
  it.each(["010-1234-5678", "01012345678", " 010 1234 5678 "])(
    "'%s'로 같은 참가자의 세션을 발급한다",
    async (phone) => {
      const response = await loginByPhone(phone);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        success: true,
        data: {
          investor_id: founder,
          investor_no: 1,
          investor_name: "홍길동",
          investor_type: "founder",
          team_id: teams[0],
          company_name: "큐네스티",
        },
      });

      const cookie = response.headers.get("set-cookie") ?? "";
      expect(cookie).toMatch(/^jumpup_session=[^;]+;/);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=lax/i);
      expect(cookie).toMatch(/Path=\//);
      expect(cookie).toMatch(/Max-Age=86400/);
    },
  );

  it("등록되지 않은 번호는 404와 안내 문구를 돌려주고 세션을 만들지 않는다", async () => {
    const response = await loginByPhone("010-0000-0000");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      success: false,
      error: "등록되지 않은 연락처입니다. 운영본부에 문의해주세요.",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("형식이 잘못된 입력은 400으로 거절한다", async () => {
    expect((await loginByPhone("12345")).status).toBe(400);
    expect((await createSession(post("/api/auth/session", "not json"))).status).toBe(400);
    expect((await createSession(post("/api/auth/session", { method: "sms", phone: "x" }))).status).toBe(400);
    expect((await createSession(post("/api/auth/session", { method: "phone" }))).status).toBe(400);
  });
});

describe("POST /api/auth/session — 초대 토큰", () => {
  const loginByToken = (token: string) => createSession(post("/api/auth/session", { method: "token", token }));

  it("유효한 토큰은 한 번만 세션을 발급한다", async () => {
    const first = await loginByToken(VALID_TOKEN);
    expect(first.status).toBe(200);
    expect((await first.json()).data.investor_id).toBe(external);
    expect(sessionCookieOf(first)).toMatch(/^jumpup_session=/);

    const second = await loginByToken(VALID_TOKEN);
    expect(second.status).toBe(400);
    expect((await second.json()).code).toBe("ALREADY_USED");
    expect(second.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    [USED_TOKEN, "ALREADY_USED"],
    [EXPIRED_TOKEN, "EXPIRED_TOKEN"],
    ["no-such-token-0123456789abcdefghijklmn", "INVALID_TOKEN"],
  ])("%s → 400 %s", async (token, code) => {
    const response = await loginByToken(token);
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe(code);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("GET /api/auth/me, POST /api/auth/logout", () => {
  it("유효한 세션 쿠키가 있으면 본인 정보를 돌려준다", async () => {
    const cookie = sessionCookieOf(await loginByPhone(FOUNDER_PHONE));
    const body = await me(get("/api/auth/me", cookie)).json();
    expect(body.data.authenticated).toBe(true);
    expect(body.data.investor).toMatchObject({ investor_id: founder, investor_no: 1, company_name: "큐네스티" });
    expect(typeof body.data.investor.created_at).toBe("number");
  });

  it("쿠키가 없거나 변조되면 미인증이다", async () => {
    expect(await me(get("/api/auth/me")).json()).toEqual({
      success: true,
      data: { authenticated: false, investor: null },
    });
    const cookie = sessionCookieOf(await loginByPhone(FOUNDER_PHONE));
    const tampered = cookie.replace(/.$/, (last) => (last === "A" ? "B" : "A"));
    expect((await me(get("/api/auth/me", tampered)).json()).data.authenticated).toBe(false);
  });

  it("로그아웃은 세션 쿠키를 즉시 만료시킨다", async () => {
    const response = logout();
    expect(await response.json()).toEqual({ success: true });
    expect(response.headers.get("set-cookie")).toMatch(/jumpup_session=;.*Max-Age=0/i);
  });
});
