import { JoinQr } from "@/components/display/JoinQr";
import type { TeamResultItem } from "@/types/results";

export function ReadyView({ teams }: { teams: TeamResultItem[] }) {
  return (
    <div className="grid h-full grid-cols-[560px_1fr] gap-16">
      <section className="flex flex-col items-center justify-center gap-8 text-center">
        <h1 className="text-display-2">스마트폰으로 참여하세요</h1>
        <JoinQr size={360} />
        <p className="text-h1 text-stage-muted">
          카메라로 QR 코드를 비추고, 등록된 휴대폰 번호로 입장합니다.
        </p>
      </section>

      <section className="flex min-h-0 flex-col">
        <h2 className="text-display-2">참여 기업</h2>
        <ul className="mt-8 grid flex-1 grid-cols-3 content-start gap-5">
          {teams.map((team) => (
            <li key={team.team_id} className="flex items-center gap-4 rounded-xl border border-stage-border bg-stage-surface p-5">
              <span className="inline-flex min-w-16 shrink-0 items-center justify-center rounded-md bg-primary px-3 py-2 text-h1 text-primary-foreground">
                {team.team_no}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-h1">{team.company_name}</span>
                <span className="block truncate text-h2 text-stage-muted">{team.leader_name} 대표</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
