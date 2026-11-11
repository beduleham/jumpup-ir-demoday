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
 * 수동 순위가 지정된 기업은 그 순위를 갖고, 나머지는 남은 자리를 자동 정렬 순서대로 채운다.
 * 같은 수동 순위를 여러 기업에 주면 공동 순위가 된다: 모두 그 순위로 표시되고,
 * 공동 순위가 차지한 자리 수만큼 다음 순위는 건너뛴다(공동 1위가 둘이면 다음은 3위).
 */
export function rankTeams<T extends RankableTeam>(teams: T[]): Ranked<T>[] {
  const ordered = [...teams].sort(byAutomaticOrder);
  // 자리(1번째, 2번째, …)는 기업마다 하나씩 차지한다. 표시 순위는 공동 순위일 때 자리와 다를 수 있다.
  const taken = new Set<number>();
  const finalRank = new Map<T, number>();

  const takeFreeSlot = (from: number) => {
    let slot = from;
    while (taken.has(slot)) slot += 1;
    taken.add(slot);
    return slot;
  };

  for (const team of ordered) {
    if (team.manual_rank_override === null) continue;
    takeFreeSlot(team.manual_rank_override);
    finalRank.set(team, team.manual_rank_override);
  }
  for (const team of ordered) {
    if (finalRank.has(team)) continue;
    finalRank.set(team, takeFreeSlot(1));
  }

  return ordered
    .map((team, index) => ({
      ...team,
      calculated_rank: index + 1,
      final_rank: finalRank.get(team) ?? index + 1,
    }))
    // 정렬은 안정적이므로 공동 순위끼리는 자동 정렬 순서를 유지한다.
    .sort((a, b) => a.final_rank - b.final_rank);
}

/**
 * 자동 정렬 기준(유치액, 투자자 수, 외부 유치액)이 모두 같아 기업 번호로만 순서가 갈린 기업들의 번호.
 * 이런 기업은 운영진이 순위를 직접 정해야 할 수 있다.
 */
export function tiedTeamNumbers(teams: RankableTeam[]): Set<number> {
  const groups = new Map<string, number[]>();
  for (const team of teams) {
    const key = `${team.total_raised_units}/${team.investor_count}/${team.external_raised_units}`;
    groups.set(key, [...(groups.get(key) ?? []), team.team_no]);
  }
  return new Set([...groups.values()].filter((group) => group.length > 1).flat());
}
