import "server-only";
import { fetchPublicTeams } from "@/lib/competition-state";
import { fetchAdminSettings, fetchRankedTeams } from "@/lib/admin-data";
import type { PublicResults, TeamResultItem } from "@/types/results";

/**
 * 누구나 읽는 결과 데이터.
 * 결과 공개 전에는 투자 집계를 아예 조회하지 않는다: 공개(anon) 권한으로 기업 소개만 읽어
 * 집계 필드를 0으로 채우고 기업 번호순으로 돌려주므로, 값이나 순서로 순위를 추론할 수 없다.
 */
export async function fetchPublicResults(): Promise<PublicResults> {
  const settings = await fetchAdminSettings();
  const base = {
    status: settings.status,
    reveal_step: settings.reveal_step,
    show_live_totals: settings.show_live_totals,
    updated_at: settings.updated_at,
  };

  if (settings.status !== "revealed") {
    const teams = await fetchPublicTeams();
    const results: TeamResultItem[] = teams
      .map((team) => ({
        team_id: team.id,
        team_no: team.team_no,
        company_name: team.company_name,
        leader_name: team.leader_name,
        description: team.description,
        total_raised_units: 0,
        investor_count: 0,
        external_raised_units: 0,
        final_rank: 0,
        is_override: false,
      }))
      .sort((a, b) => a.team_no - b.team_no);
    return { ...base, results };
  }

  // 결과 공개 이후: 관리자 콘솔·CSV와 같은 순위 계산을 쓰되 연락처 같은 운영 정보는 싣지 않는다.
  const ranked = await fetchRankedTeams();
  return {
    ...base,
    results: ranked.map((team) => ({
      team_id: team.id,
      team_no: team.team_no,
      company_name: team.company_name,
      leader_name: team.leader_name,
      description: team.description,
      total_raised_units: team.total_raised_units,
      investor_count: team.investor_count,
      external_raised_units: team.external_raised_units,
      final_rank: team.final_rank,
      is_override: team.manual_rank_override !== null,
    })),
  };
}
