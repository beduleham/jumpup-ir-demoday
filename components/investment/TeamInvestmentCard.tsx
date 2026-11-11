import { Minus, Plus, ShieldAlert } from "lucide-react";
import type { PublicTeam } from "@/types/competition";

const STEP_BUTTON =
  "inline-flex min-h-12 min-w-12 flex-1 items-center justify-center gap-1 rounded-md px-3 text-h3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40";

export function TeamInvestmentCard({
  team,
  units,
  isOwnTeam,
  canDecrease,
  canIncrease,
  onChange,
}: {
  team: PublicTeam;
  /** 내가 이 기업에 배분한 금액(억 원) */
  units: number;
  isOwnTeam: boolean;
  canDecrease: boolean;
  canIncrease: boolean;
  onChange: (delta: 1 | -1) => void;
}) {
  return (
    <li className={`rounded-xl border bg-surface p-4 ${isOwnTeam ? "border-danger" : "border-border"}`}>
      {isOwnTeam ? (
        <p className="mb-2 inline-flex items-center gap-1 rounded-sm bg-danger-surface px-2 py-1 text-caption font-semibold text-danger">
          <ShieldAlert aria-hidden="true" size={14} strokeWidth={2} />
          내 기업 (투자 불가)
        </p>
      ) : null}

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

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="min-w-20 text-text">
          <span className="block text-caption text-text-muted">내 투자</span>
          <strong className="text-h2">{units}억 원</strong>
        </p>
        <div className="flex flex-1 gap-2">
          <button
            type="button"
            onClick={() => onChange(-1)}
            disabled={isOwnTeam || !canDecrease}
            aria-label={`${team.company_name} 투자금 1억 원 줄이기`}
            className={`${STEP_BUTTON} border border-text-muted bg-surface text-text`}
          >
            <Minus aria-hidden="true" size={20} strokeWidth={2} />
            1억
          </button>
          <button
            type="button"
            onClick={() => onChange(1)}
            disabled={isOwnTeam || !canIncrease}
            aria-label={`${team.company_name} 투자금 1억 원 늘리기`}
            className={`${STEP_BUTTON} bg-primary text-primary-foreground hover:bg-primary-hover`}
          >
            <Plus aria-hidden="true" size={20} strokeWidth={2} />
            1억
          </button>
        </div>
      </div>
    </li>
  );
}
