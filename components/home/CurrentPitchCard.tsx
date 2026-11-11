import type { PublicTeam } from "@/types/competition";

export function CurrentPitchCard({ team }: { team: PublicTeam }) {
  return (
    <section
      aria-labelledby="current-pitch-title"
      className="rounded-xl border-2 border-accent bg-surface p-4"
    >
      <p className="text-caption font-semibold text-text-muted">지금 발표 중인 기업</p>
      <div className="mt-2 flex items-start gap-3">
        <span className="inline-flex min-w-12 shrink-0 items-center justify-center rounded-md bg-accent px-2 py-2 text-h3 font-semibold text-accent-foreground">
          {team.team_no}번
        </span>
        <div className="min-w-0">
          <h2 id="current-pitch-title" className="text-h2 text-text">
            {team.company_name}
          </h2>
          <p className="text-text-muted">발표자 {team.leader_name} 대표</p>
        </div>
      </div>
      {team.description ? <p className="mt-3 text-text">{team.description}</p> : null}
    </section>
  );
}
