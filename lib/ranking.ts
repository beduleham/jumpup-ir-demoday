export interface RankableTeam {
  team_no: number;
  total_raised_units: number;
  investor_count: number;
  external_raised_units: number;
  manual_rank_override: number | null;
}

export type Ranked<T> = T & {
  /** 자동 정렬 순위: 유치액 → 투자자 수 → 외부 유치액(모두 내림차순) → 기업 번호(오름차순) */
  calculated_rank: number;
  /** 수동 보정을 반영한 최종 순위 */
  final_rank: number;
};

function byAutomaticOrder(a: RankableTeam, b: RankableTeam): number {
  return (
    b.total_raised_units - a.total_raised_units ||
    b.investor_count - a.investor_count ||
    b.external_raised_units - a.external_raised_units ||
    a.team_no - b.team_no
  );
}

/**
 * 순위를 매겨 최종 순위 순으로 돌려준다.
 * 수동 순위가 지정된 기업은 그 순위를 갖고, 나머지는 남은 순위를 자동 정렬 순서대로 채운다.
 * 같은 수동 순위가 겹치면 자동 정렬에서 앞선 기업이 그 순위를 갖고 뒤 기업은 다음 빈 순위로 밀린다.
 */
export function rankTeams<T extends RankableTeam>(teams: T[]): Ranked<T>[] {
  const ordered = [...teams].sort(byAutomaticOrder);
  const taken = new Set<number>();
  const finalRank = new Map<T, number>();

  const nextFree = (from: number) => {
    let rank = from;
    while (taken.has(rank)) rank += 1;
    return rank;
  };

  for (const team of ordered) {
    if (team.manual_rank_override === null) continue;
    const rank = nextFree(team.manual_rank_override);
    taken.add(rank);
    finalRank.set(team, rank);
  }
  for (const team of ordered) {
    if (finalRank.has(team)) continue;
    const rank = nextFree(1);
    taken.add(rank);
    finalRank.set(team, rank);
  }

  return ordered
    .map((team, index) => ({
      ...team,
      calculated_rank: index + 1,
      final_rank: finalRank.get(team) ?? index + 1,
    }))
    .sort((a, b) => a.final_rank - b.final_rank);
}
