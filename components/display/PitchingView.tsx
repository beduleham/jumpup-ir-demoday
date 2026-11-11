import type { PublicTeam } from "@/types/competition";
import type { TeamResultItem } from "@/types/results";

export function PitchingView({ current, teams }: { current: PublicTeam | null; teams: TeamResultItem[] }) {
  return (
    <div className="flex h-full flex-col">
      <section className="flex flex-1 flex-col items-center justify-center text-center">
        {current ? (
          <>
            <p className="rounded-xl bg-primary px-8 py-3 text-display-2 text-primary-foreground">
              {current.team_no}번 · 지금 발표 중
            </p>
            <h1 className="mt-8 text-display-1">{current.company_name}</h1>
            <p className="mt-4 text-display-2 text-stage-muted">{current.leader_name} 대표</p>
            {current.description ? (
              <p className="mt-10 max-w-[1400px] text-display-2 font-normal">{current.description}</p>
            ) : null}
          </>
        ) : (
          <h1 className="text-display-1">다음 발표를 준비하고 있습니다</h1>
        )}
      </section>

      <ol aria-label="발표 순서" className="flex flex-wrap justify-center gap-3">
        {teams.map((team) => {
          const active = team.team_id === current?.id;
          return (
            <li
              key={team.team_id}
              aria-current={active ? "step" : undefined}
              className={`rounded-md border px-4 py-2 text-h2 ${
                active
                  ? "border-accent bg-accent font-semibold text-accent-foreground"
                  : "border-stage-border bg-stage-surface text-stage-muted"
              }`}
            >
              {team.team_no}. {team.company_name}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
