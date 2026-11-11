import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicStateResponseSchema, type CompetitionStatus } from "@/types/competition";

type Row = Record<string, unknown>;

// 가짜 Supabase: select 열 지정을 무시하고 행 전체를 돌려줘, 응답 정제가 실제로 동작하는지 본다.
const db = vi.hoisted(() => ({
  tables: { settings: [] as Row[], teams: [] as Row[] },
  selects: [] as { table: string; columns: string }[],
  failWith: null as string | null,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from(table: "settings" | "teams") {
      let rows = db.tables[table];
      const result = (data: unknown) =>
        db.failWith ? { data: null, error: { message: db.failWith } } : { data, error: null };
      const builder = {
        select(columns: string) {
          db.selects.push({ table, columns });
          return builder;
        },
        limit: () => builder,
        eq(column: string, value: unknown) {
          rows = rows.filter((row) => row[column] === value);
          return builder;
        },
        order: async () => result(rows),
        maybeSingle: async () => result(rows[0] ?? null),
      };
      return builder;
    },
  }),
}));

import { GET } from "@/app/api/public/state/route";

const TEAM = {
  id: "team-1",
  team_no: 7,
  company_name: "큐네스티",
  leader_name: "홍길동",
  description: "현장 행사 운영 솔루션",
  phone: "01012345678",
  manual_rank_override: 1,
  rank: 1,
  total_amount: 42,
  investor_count: 9,
};

function seed(status: CompetitionStatus, pitchTeamId: string | null = null) {
  db.tables.settings = [
    {
      id: "settings-1",
      status,
      reveal_step: 0,
      budget_units: 10,
      current_pitch_team_id: pitchTeamId,
      updated_at: "2026-11-11T06:45:47.654005+00:00",
      show_live_totals: false,
      total_units: 123,
      score: 99,
    },
  ];
  db.tables.teams = [TEAM];
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-placeholder";
  db.selects.length = 0;
  db.failWith = null;
});

describe("GET /api/public/state", () => {
  const statuses: CompetitionStatus[] = ["ready", "pitching", "open", "closed", "revealed"];

  it.each(statuses)("%s 상태에서 집계·비공개 필드 없이 계약된 필드만 돌려준다", async (status) => {
    seed(status, "team-1");

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");

    const text = await response.text();
    expect(text).not.toMatch(/rank|score|amount|total_units|investor_count|phone/);

    const body = publicStateResponseSchema.parse(JSON.parse(text));
    expect(body).toEqual({
      success: true,
      data: {
        status,
        reveal_step: 0,
        budget_units: 10,
        current_pitch_team: {
          id: "team-1",
          team_no: 7,
          company_name: "큐네스티",
          leader_name: "홍길동",
          description: "현장 행사 운영 솔루션",
        },
        updated_at: "2026-11-11T06:45:47.654Z",
      },
    });
  });

  it("발표 기업이 지정되지 않으면 current_pitch_team은 null이다", async () => {
    seed("ready");
    const body = publicStateResponseSchema.parse(await (await GET()).json());
    expect(body.success && body.data.current_pitch_team).toBeNull();
  });

  it("공개 가능한 열만 조회하고 investments는 읽지 않는다", async () => {
    seed("pitching", "team-1");
    await GET();
    expect(db.selects.map((select) => select.table)).toEqual(["settings", "teams"]);
    for (const select of db.selects) {
      expect(select.columns).not.toMatch(/\*|rank|amount|phone|note/);
    }
  });

  it("settings 레코드가 없으면 내부 정보 없이 503을 돌려준다", async () => {
    db.tables.settings = [];
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      success: false,
      error: { message: "대회 상태 정보를 불러올 수 없습니다." },
    });
  });

  it("DB 오류 메시지는 응답에 노출하지 않는다", async () => {
    seed("open");
    db.failWith = 'relation "settings" does not exist';
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("relation");
  });
});
