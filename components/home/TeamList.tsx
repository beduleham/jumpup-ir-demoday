import type { PublicTeam } from "@/types/competition";

// 참가 기업 목록. 투자 작업에서 각 항목에 +1억/-1억 조작부를 붙인다.
export function TeamList({ teams }: { teams: PublicTeam[] }) {
  return (
    <section id="teams" aria-labelledby="teams-title" className="scroll-mt-24">
      <h2 id="teams-title" className="text-h2 text-text">
        발표 참가 기업
      </h2>

      {teams.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-surface p-4 text-center">
          <p className="text-h3 text-text">현재 등록된 발표 참가 기업이 없습니다.</p>
          <p className="mt-1 text-text-muted">대회 운영진의 기업 등록을 기다려 주세요.</p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {teams.map((team) => (
            <li key={team.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex min-w-12 shrink-0 items-center justify-center rounded-md bg-body px-2 py-2 text-h3 text-text">
                  {team.team_no}번
                </span>
                <div className="min-w-0">
                  <h3 className="text-h3 font-semibold text-text">{team.company_name}</h3>
                  <p className="text-caption text-text-muted">{team.leader_name} 대표</p>
                </div>
              </div>
              {team.description ? <p className="mt-2 text-text">{team.description}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
