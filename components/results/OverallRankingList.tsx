import type { TeamResultItem } from "@/types/results";

/** 전체 기업의 최종 순위. 내 기업 행은 배경과 표시로 구분한다. */
export function OverallRankingList({
  results,
  myTeamId,
}: {
  results: TeamResultItem[];
  myTeamId: string | null;
}) {
  return (
    <section aria-labelledby="ranking-title" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="ranking-title" className="text-h2 text-text">
        전체 기업 순위
      </h3>
      <ol className="mt-3 flex flex-col gap-2">
        {results.map((team) => {
          const mine = team.team_id === myTeamId;
          return (
            <li
              key={team.team_id}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 ${mine ? "border-primary bg-body" : "border-border"}`}
            >
              <span className="inline-flex min-w-12 shrink-0 justify-center rounded-sm bg-body px-2 py-1 text-h3 font-semibold text-text">
                {team.final_rank}위
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-h3 text-text">
                  {team.company_name}
                  {mine ? (
                    <span className="ml-2 rounded-sm bg-primary px-2 py-0.5 text-caption font-semibold text-primary-foreground">
                      내 기업
                    </span>
                  ) : null}
                </span>
                <span className="block text-caption text-text-muted">
                  {team.team_no}번 · {team.leader_name} 대표
                </span>
              </span>
              <span className="shrink-0 text-h3 font-semibold text-text">{team.total_raised_units}억 원</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
