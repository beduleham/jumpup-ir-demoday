import "server-only";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/server";
import {
  competitionStatusSchema,
  publicTeamSchema,
  type PublicState,
  type PublicTeam,
} from "@/types/competition";

// 공개 가능한 열만 명시한다. 순위·투자 집계와 investments 테이블은 여기서 절대 읽지 않는다.
const SETTINGS_COLUMNS = "status, reveal_step, budget_units, current_pitch_team_id, updated_at";
const TEAM_COLUMNS = "id, team_no, company_name, leader_name, description";

const settingsRowSchema = z.object({
  status: competitionStatusSchema,
  reveal_step: z.number().int(),
  budget_units: z.number().int(),
  current_pitch_team_id: z.string().nullable(),
  updated_at: z.string(),
});

export async function fetchPublicState(): Promise<PublicState> {
  const supabase = createPublicClient();

  const settings = await supabase.from("settings").select(SETTINGS_COLUMNS).limit(1).maybeSingle();
  if (settings.error) throw new Error(`settings 조회 실패: ${settings.error.message}`);
  if (!settings.data) throw new Error("settings 레코드가 없습니다.");
  const row = settingsRowSchema.parse(settings.data);

  let currentPitchTeam: PublicTeam | null = null;
  if (row.current_pitch_team_id) {
    const team = await supabase
      .from("teams")
      .select(TEAM_COLUMNS)
      .eq("id", row.current_pitch_team_id)
      .maybeSingle();
    if (team.error) throw new Error(`발표 기업 조회 실패: ${team.error.message}`);
    currentPitchTeam = team.data ? publicTeamSchema.parse(team.data) : null;
  }

  return {
    status: row.status,
    reveal_step: row.reveal_step,
    budget_units: row.budget_units,
    current_pitch_team: currentPitchTeam,
    // DB의 timestamptz(+00:00 표기 포함)를 ISO 8601 UTC 문자열로 통일한다.
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

export async function fetchPublicTeams(): Promise<PublicTeam[]> {
  const supabase = createPublicClient();
  const teams = await supabase.from("teams").select(TEAM_COLUMNS).order("team_no");
  if (teams.error) throw new Error(`기업 목록 조회 실패: ${teams.error.message}`);
  return z.array(publicTeamSchema).parse(teams.data);
}
