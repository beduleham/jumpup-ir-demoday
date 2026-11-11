import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SetInvestmentResult } from "@/types/database";
import { startLocalDatabase, type ApiRole, type LocalDatabase } from "./local-postgres";

let db: LocalDatabase;
let teams: string[]; // team_no 1..12 순서의 id
let founders: string[]; // 같은 순서의 대표 투자자 id
let external: string; // 101번 외부 심사위원 id

beforeAll(async () => {
  db = await startLocalDatabase();
}, 180_000);

afterAll(async () => {
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
    insert into public.teams (team_no, company_name, leader_name, phone)
    select n, '기업 ' || n, '대표 ' || n, '0101000' || lpad(n::text, 4, '0')
    from generate_series(1, 12) as n
    returning id, team_no
  `);
  teams = teamRows.rows.map((row) => row.id);
  const founderRows = await db.admin.query<{ id: string }>(`
    insert into public.investors (investor_no, investor_name, phone, investor_type, team_id)
    select t.team_no, t.leader_name, t.phone, 'founder', t.id
    from public.teams as t order by t.team_no
    returning id
  `);
  founders = founderRows.rows.map((row) => row.id);
  const externalRow = await db.admin.query<{ id: string }>(`
    insert into public.investors (investor_no, investor_name, phone, investor_type)
    values (101, '김심사', '01099990101', 'external') returning id
  `);
  external = externalRow.rows[0].id;
});

async function setInvestment(investor: string, team: string, units: number) {
  const result = await db
    .as("service_role")
    .query<{ result: SetInvestmentResult }>(
      "select public.set_investment($1, $2, $3) as result",
      [investor, team, units],
    );
  return result.rows[0].result;
}

async function totalOf(investor: string): Promise<number> {
  const result = await db.admin.query<{ total: string }>(
    "select coalesce(sum(amount_units), 0) as total from public.investments where investor_id = $1",
    [investor],
  );
  return Number(result.rows[0].total);
}

async function setStatus(status: string) {
  await db.admin.query("update public.settings set status = $1", [status]);
}

describe("스키마", () => {
  it("네 테이블이 만들어지고 모두 RLS가 켜져 있다", async () => {
    const result = await db.admin.query<{ relname: string; relrowsecurity: boolean }>(`
      select relname, relrowsecurity from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname
    `);
    expect(result.rows).toEqual([
      { relname: "investments", relrowsecurity: true },
      { relname: "investors", relrowsecurity: true },
      { relname: "settings", relrowsecurity: true },
      { relname: "teams", relrowsecurity: true },
    ]);
  });

  it("settings는 기본값을 가진 행 하나만 허용한다", async () => {
    const rows = await db.admin.query("select budget_units, reveal_step from public.settings");
    expect(rows.rows).toEqual([{ budget_units: 10, reveal_step: 0 }]);
    await expect(db.admin.query("insert into public.settings default values")).rejects.toThrow(
      /uq_settings_single_row/,
    );
  });

  it("투자자 번호와 소속 규칙을 강제한다", async () => {
    const insert = (no: number, type: string, team: string | null) =>
      db.admin.query(
        "insert into public.investors (investor_no, investor_name, phone, investor_type, team_id) values ($1, '테스트', $2, $3, $4)",
        [no, `0105555${no}`, type, team],
      );
    await expect(insert(50, "founder", null)).rejects.toThrow(/chk_investor_team_consistency/);
    await expect(insert(102, "external", teams[0])).rejects.toThrow(/chk_investor_team_consistency/);
    await expect(insert(50, "external", null)).rejects.toThrow(/chk_investor_no_range/);
    await expect(insert(150, "founder", teams[0])).rejects.toThrow(/chk_investor_no_range/);
  });
});

describe("set_investment", () => {
  it("배분 결과와 잔여 예산을 돌려준다", async () => {
    expect(await setInvestment(founders[0], teams[1], 3)).toEqual({
      success: true,
      investor_id: founders[0],
      team_id: teams[1],
      allocated_units: 3,
      total_invested_units: 3,
      remaining_units: 7,
    });
    expect((await setInvestment(founders[0], teams[2], 4)).remaining_units).toBe(3);
    // 같은 기업의 금액을 바꾸면 차액만 반영된다.
    expect((await setInvestment(founders[0], teams[1], 6)).remaining_units).toBe(0);
  });

  it.each(["ready", "pitching", "closed", "revealed"])("%s 상태에서는 거절한다", async (status) => {
    await setStatus(status);
    await expect(setInvestment(external, teams[0], 1)).rejects.toThrow(
      "현재는 투자 오픈 상태가 아닙니다.",
    );
    expect(await totalOf(external)).toBe(0);
  });

  it("대표는 자기 소속 기업에 투자할 수 없다", async () => {
    await expect(setInvestment(founders[0], teams[0], 1)).rejects.toThrow(
      "자기 소속 기업에는 투자할 수 없습니다.",
    );
    expect(await totalOf(founders[0])).toBe(0);
  });

  it("외부 심사위원은 같은 기업에 투자할 수 있다", async () => {
    expect((await setInvestment(external, teams[0], 2)).total_invested_units).toBe(2);
  });

  it("총 10억 원을 넘는 배분은 거절하고 기존 배분을 보존한다", async () => {
    await expect(setInvestment(external, teams[0], 11)).rejects.toThrow(
      "가상 투자금 한도(10억 원)를 초과할 수 없습니다.",
    );
    await setInvestment(external, teams[0], 6);
    await expect(setInvestment(external, teams[1], 5)).rejects.toThrow(
      "가상 투자금 한도(10억 원)를 초과할 수 없습니다.",
    );
    expect(await totalOf(external)).toBe(6);
    expect((await setInvestment(external, teams[1], 4)).remaining_units).toBe(0);
  });

  it("0을 지정하면 해당 기업의 투자 행을 지운다", async () => {
    await setInvestment(external, teams[0], 3);
    await setInvestment(external, teams[1], 2);
    expect((await setInvestment(external, teams[0], 0)).remaining_units).toBe(8);
    const rows = await db.admin.query(
      "select team_id from public.investments where investor_id = $1",
      [external],
    );
    expect(rows.rows).toEqual([{ team_id: teams[1] }]);
  });

  it("음수, 없는 투자자, 없는 기업을 거절한다", async () => {
    const missing = "00000000-0000-4000-8000-000000000000";
    await expect(setInvestment(external, teams[0], -1)).rejects.toThrow("투자 금액은 0 이상이어야 합니다.");
    await expect(setInvestment(missing, teams[0], 1)).rejects.toThrow("유효하지 않은 투자자입니다.");
    await expect(setInvestment(external, missing, 1)).rejects.toThrow("대상 기업이 존재하지 않습니다.");
  });

  it("단일 기업 최대 한도가 설정되면 그 이상은 거절한다", async () => {
    await db.admin.query("update public.settings set max_units_per_team = 3");
    await expect(setInvestment(external, teams[0], 4)).rejects.toThrow(
      "단일 기업 최대 투자 한도(3억 원)를 초과할 수 없습니다.",
    );
    expect((await setInvestment(external, teams[0], 3)).allocated_units).toBe(3);
  });
});

describe("동시 요청", () => {
  it("투자 내역이 없는 투자자가 12개 기업에 동시에 1억씩 넣어도 10억을 넘지 않는다", async () => {
    const results = await Promise.allSettled(teams.map((team) => setInvestment(external, team, 1)));
    const rejected = results.filter((result) => result.status === "rejected");

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(10);
    expect(rejected).toHaveLength(2);
    for (const result of rejected) {
      expect(String(result.reason)).toContain("가상 투자금 한도(10억 원)를 초과할 수 없습니다.");
    }
    expect(await totalOf(external)).toBe(10);
  });

  it("두 기업에 6억씩 동시에 여러 번 요청해도 합계가 10억을 넘지 않는다", async () => {
    const calls = Array.from({ length: 20 }, (_, index) =>
      setInvestment(external, teams[index % 2], 6),
    );
    await Promise.allSettled(calls);
    expect(await totalOf(external)).toBe(6);
  });

  it("같은 기업에 대한 동시 증감 10건이 직렬화되어 마지막 값 하나만 남는다", async () => {
    const targets = [1, 2, 3, 4, 5, 4, 3, 2, 1, 2];
    const results = await Promise.allSettled(
      targets.map((units) => setInvestment(founders[0], teams[1], units)),
    );
    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const rows = await db.admin.query<{ amount_units: number }>(
      "select amount_units from public.investments where investor_id = $1",
      [founders[0]],
    );
    expect(rows.rows).toHaveLength(1);
    expect(targets).toContain(rows.rows[0].amount_units);
  });
});

describe("브라우저 역할의 접근 차단", () => {
  const browserRoles: ApiRole[] = ["anon", "authenticated"];

  it.each(browserRoles)("%s: 공개 정보는 읽을 수 있다", async (role) => {
    const pool = db.as(role);
    expect((await pool.query("select status, budget_units from public.settings")).rowCount).toBe(1);
    const visible = await pool.query(
      "select id, team_no, company_name, leader_name, description from public.teams",
    );
    expect(visible.rowCount).toBe(12);
  });

  it.each(browserRoles)("%s: 연락처·운영 정보·투자 내역은 읽을 수 없다", async (role) => {
    const pool = db.as(role);
    await setInvestment(external, teams[0], 1);
    await expect(pool.query("select phone from public.teams")).rejects.toThrow(/permission denied/);
    await expect(pool.query("select note, manual_rank_override from public.teams")).rejects.toThrow(
      /permission denied/,
    );
    await expect(pool.query("select * from public.teams")).rejects.toThrow(/permission denied/);
    await expect(pool.query("select * from public.investors")).rejects.toThrow(/permission denied/);
    await expect(pool.query("select * from public.investments")).rejects.toThrow(/permission denied/);
  });

  it.each(browserRoles)("%s: 어떤 테이블에도 직접 쓸 수 없다", async (role) => {
    const pool = db.as(role);
    await expect(
      pool.query("insert into public.investments (investor_id, team_id, amount_units) values ($1, $2, 1)", [
        external,
        teams[0],
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(pool.query("update public.investments set amount_units = 10")).rejects.toThrow(
      /permission denied/,
    );
    await expect(pool.query("delete from public.investments")).rejects.toThrow(/permission denied/);
    await expect(pool.query("update public.settings set status = 'revealed'")).rejects.toThrow(
      /permission denied/,
    );
    await expect(pool.query("update public.teams set manual_rank_override = 1")).rejects.toThrow(
      /permission denied/,
    );
  });

  it.each(browserRoles)("%s: RPC를 직접 실행할 수 없다", async (role) => {
    const pool = db.as(role);
    await expect(
      pool.query("select public.set_investment($1, $2, 1)", [external, teams[0]]),
    ).rejects.toThrow(/permission denied/);
    await expect(pool.query("select public.reset_investments_data()")).rejects.toThrow(
      /permission denied/,
    );
    expect(await totalOf(external)).toBe(0);
  });
});

describe("reset_investments_data", () => {
  it("투자 내역만 지우고 대회를 준비 상태로 되돌린다", async () => {
    await setInvestment(external, teams[0], 5);
    await setInvestment(founders[0], teams[1], 2);
    await db.admin.query(
      "update public.settings set status = 'revealed', reveal_step = 4, current_pitch_team_id = $1",
      [teams[0]],
    );

    const result = await db.as("service_role").query("select public.reset_investments_data() as result");
    expect(result.rows[0].result).toEqual({
      success: true,
      message: "투자 데이터가 성공적으로 초기화되었습니다.",
    });

    const counts = await db.admin.query(`
      select (select count(*)::int from public.investments) as investments,
             (select count(*)::int from public.investors) as investors,
             (select count(*)::int from public.teams) as teams
    `);
    expect(counts.rows[0]).toEqual({ investments: 0, investors: 13, teams: 12 });

    const settings = await db.admin.query(
      "select status, reveal_step, current_pitch_team_id from public.settings",
    );
    expect(settings.rows).toEqual([{ status: "ready", reveal_step: 0, current_pitch_team_id: null }]);
  });
});
