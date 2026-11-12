import "server-only";
import { z } from "zod";
import type { BulkRow } from "@/lib/bulk-parse";
import { rankTeams } from "@/lib/ranking";
import { transitionProblem } from "@/lib/state-machine";
import { createServiceClient } from "@/lib/supabase/server";
import {
  adminSettingsSchema,
  type AdminDashboard,
  type AdminSettings,
  type UpdateSettingsRequest,
} from "@/types/admin";
import type { Database } from "@/types/database";

// 관리자 콘솔의 데이터 접근. 모든 함수는 RLS를 우회하는 특권 클라이언트를 쓰므로,
// 호출하는 라우트가 먼저 rejectUnlessAdmin으로 관리자 세션을 확인해야 한다.

/** 관리자의 입력이 잘못되어 거절한 요청. message는 관리자에게 그대로 보여 준다. */
export class AdminRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const SETTINGS_COLUMNS = "id, status, current_pitch_team_id, reveal_step, budget_units, show_live_totals, updated_at";

// plpgsql RAISE EXCEPTION, 외래키 위반
const RAISE_EXCEPTION = "P0001";
const FOREIGN_KEY_VIOLATION = "23503";

const dashboardRowsSchema = z.object({
  teams: z.array(
    z.object({
      id: z.string(),
      team_no: z.number().int(),
      company_name: z.string(),
      leader_name: z.string(),
      phone: z.string(),
      description: z.string(),
      note: z.string(),
      manual_rank_override: z.number().int().nullable(),
      total_raised_units: z.number().int(),
      investor_count: z.number().int(),
      external_raised_units: z.number().int(),
    }),
  ),
  investors: z.array(
    z.object({
      id: z.string(),
      investor_no: z.number().int(),
      investor_name: z.string(),
      phone: z.string(),
      investor_type: z.enum(["founder", "external"]),
      team_id: z.string().nullable(),
      allocated_units: z.number().int(),
    }),
  ),
});

const investmentRowsSchema = z.array(
  z.object({ investor_id: z.string(), team_id: z.string(), amount_units: z.number().int() }),
);
export type InvestmentRow = z.infer<typeof investmentRowsSchema>[number];

async function readSettings() {
  const supabase = createServiceClient();
  const settings = await supabase.from("settings").select(SETTINGS_COLUMNS).limit(1).maybeSingle();
  if (settings.error) throw new Error(`settings 조회 실패: ${settings.error.message}`);
  if (!settings.data) throw new Error("settings 레코드가 없습니다.");
  return { id: settings.data.id, ...toAdminSettings(settings.data) };
}

function toAdminSettings(row: Omit<AdminSettings, "status"> & { status: string }): AdminSettings {
  return adminSettingsSchema.parse({ ...row, updated_at: new Date(row.updated_at).toISOString() });
}

/** 현재 대회 설정(단계, 발표 기업, 시상 단계 등). */
export async function fetchAdminSettings(): Promise<AdminSettings> {
  return adminSettingsSchema.parse(await readSettings());
}

async function readDashboardRows() {
  const rows = await createServiceClient().rpc("admin_dashboard_data");
  if (rows.error) throw new Error(`대시보드 집계 실패: ${rows.error.message}`);
  return dashboardRowsSchema.parse(rows.data);
}

/** 기업별 유치 집계에 순위를 매겨 최종 순위 순으로 돌려준다. */
export async function fetchRankedTeams() {
  return rankTeams((await readDashboardRows()).teams);
}

export async function fetchDashboard(): Promise<AdminDashboard> {
  const [settings, data] = await Promise.all([readSettings(), readDashboardRows()]);

  const investors = data.investors.map((investor) => {
    const remaining = settings.budget_units - investor.allocated_units;
    return { ...investor, remaining_units: remaining, is_submitted: remaining === 0 };
  });
  const participated = investors.filter((investor) => investor.allocated_units > 0).length;

  return {
    settings: adminSettingsSchema.parse(settings),
    summary: {
      total_investors: investors.length,
      participated_investors: participated,
      participation_rate:
        investors.length === 0 ? 0 : Math.round((participated / investors.length) * 1000) / 10,
      total_invested_units: investors.reduce((sum, investor) => sum + investor.allocated_units, 0),
    },
    teams: rankTeams(data.teams),
    investors,
  };
}

export async function fetchInvestmentRows(): Promise<InvestmentRow[]> {
  const rows = await createServiceClient().rpc("admin_investment_rows");
  if (rows.error) throw new Error(`투자 원장 조회 실패: ${rows.error.message}`);
  return investmentRowsSchema.parse(rows.data);
}

export async function updateSettings(patch: UpdateSettingsRequest): Promise<AdminSettings> {
  const { confirm_revert: confirmedRevert = false, ...changes } = patch;
  const current = await readSettings();
  const nextStatus = changes.status ?? current.status;

  const problem = transitionProblem(current.status, nextStatus, confirmedRevert);
  if (problem) throw new AdminRequestError(problem, 400);

  if (changes.reveal_step !== undefined && nextStatus !== "revealed") {
    throw new AdminRequestError("시상 단계는 결과 공개 상태에서만 바꿀 수 있습니다.", 400);
  }

  const update: Database["public"]["Tables"]["settings"]["Update"] = {
    ...changes,
    updated_at: new Date().toISOString(),
  };
  // 결과 공개에 새로 들어가거나 벗어날 때는 시상 연출을 처음(숨김)으로 되돌린다.
  if (changes.status !== undefined && changes.status !== current.status && changes.reveal_step === undefined) {
    update.reveal_step = 0;
  }

  const result = await createServiceClient()
    .from("settings")
    .update(update)
    .eq("id", current.id)
    .select(SETTINGS_COLUMNS)
    .single();
  if (result.error) {
    if (result.error.code === FOREIGN_KEY_VIOLATION) {
      throw new AdminRequestError("선택한 발표 기업을 찾을 수 없습니다.", 400);
    }
    throw new Error(`settings 갱신 실패: ${result.error.message}`);
  }
  return toAdminSettings(result.data);
}

/**
 * 수동 순위를 저장하고, 화면들이 결과를 다시 읽도록 설정의 변경 시각을 갱신해 돌려준다.
 * (대형 스크린은 설정이 바뀌었을 때 결과를 새로 읽는다.)
 */
export async function overrideTeamRank(teamId: string, rank: number | null): Promise<AdminSettings> {
  const supabase = createServiceClient();
  const result = await supabase
    .from("teams")
    .update({ manual_rank_override: rank })
    .eq("id", teamId)
    .select("id")
    .maybeSingle();
  if (result.error) throw new Error(`수동 순위 저장 실패: ${result.error.message}`);
  if (!result.data) throw new AdminRequestError("기업을 찾을 수 없습니다.", 404);

  const current = await readSettings();
  const touched = await supabase
    .from("settings")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", current.id)
    .select(SETTINGS_COLUMNS)
    .single();
  if (touched.error) throw new Error(`settings 갱신 실패: ${touched.error.message}`);
  return toAdminSettings(touched.data);
}

const bulkResultSchema = z.object({
  registered_teams_count: z.number().int(),
  registered_investors_count: z.number().int(),
});

/** 검증을 통과한 행을 한 트랜잭션으로 등록한다. */
export async function bulkRegister(rows: BulkRow[]) {
  const payload = rows.map((row) => ({
    line: row.line,
    no: row.no,
    company_name: row.company_name,
    leader_name: row.leader_name,
    phone: row.phone,
    description: row.description,
    note: row.note,
  }));
  const result = await createServiceClient().rpc("admin_bulk_register", { p_rows: payload });
  if (result.error) {
    // 이미 등록된 다른 번호와 전화번호가 겹치는 등, DB 함수가 사유를 적어 거절한 경우
    if (result.error.code === RAISE_EXCEPTION) throw new AdminRequestError(result.error.message, 409);
    throw new Error(`일괄 등록 실패: ${result.error.message}`);
  }
  return bulkResultSchema.parse(result.data);
}

export async function resetInvestments(): Promise<void> {
  const result = await createServiceClient().rpc("reset_investments_data");
  if (result.error) throw new Error(`투자 초기화 실패: ${result.error.message}`);
}

/**
 * 투자 내역과 명단(기업·투자자·초대 토큰)을 모두 지우고 대회를 '준비' 단계로 되돌린다.
 * 먼저 투자를 초기화해 단계를 '준비'로 돌려 새 투자를 막은 뒤 명단을 지운다.
 * 투자자를 지우면 그 투자 내역과 초대 토큰이, 기업을 지우면 소속 대표가 함께 지워진다(외래 키).
 * 중간에 실패하면 다시 실행해 마저 지울 수 있다.
 */
export async function resetRoster(): Promise<void> {
  await resetInvestments();
  const supabase = createServiceClient();
  // 조건 없는 전체 삭제는 Supabase가 거부하므로, 모든 행이 만족하는 조건(번호 1 이상)을 붙인다.
  const investors = await supabase.from("investors").delete().gte("investor_no", 1);
  if (investors.error) throw new Error(`투자자 명단 삭제 실패: ${investors.error.message}`);
  const teams = await supabase.from("teams").delete().gte("team_no", 1);
  if (teams.error) throw new Error(`기업 명단 삭제 실패: ${teams.error.message}`);
}
