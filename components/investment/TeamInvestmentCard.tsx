import { InvestmentControls } from "@/components/investment/InvestmentControls";
import { OwnTeamBadge, OwnTeamNotice } from "@/components/investment/OwnTeamBadge";
import type { PublicTeam } from "@/types/competition";

export function TeamInvestmentCard({
  team,
  units,
  isOwnTeam,
  canDecrease,
  canIncrease,
  limitReached,
  onChange,
  onLimitTap,
}: {
  team: PublicTeam;
  /** 내가 이 기업에 배분한 금액(억 원) */
  units: number;
  isOwnTeam: boolean;
  canDecrease: boolean;
  canIncrease: boolean;
  /** 투자는 열려 있지만 남은 투자금이 없는 상태 */
  limitReached: boolean;
  onChange: (delta: 1 | -1) => void;
  onLimitTap: () => void;
}) {
  return (
    <li
      className={`rounded-xl border bg-surface p-4 ${isOwnTeam ? "border-dashed border-danger" : "border-border"}`}
    >
      {isOwnTeam ? <OwnTeamBadge /> : null}

      {/* 자기 기업은 소개를 흐리게 해 다른 기업과 구분한다. 표시와 안내 문구는 또렷하게 둔다. */}
      <div className={isOwnTeam ? "opacity-50" : undefined}>
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
      </div>

      {isOwnTeam ? (
        <OwnTeamNotice units={units} />
      ) : (
        <InvestmentControls
          teamName={team.company_name}
          currentUnits={units}
          canDecrease={canDecrease}
          canIncrease={canIncrease}
          limitReached={limitReached}
          onIncrement={() => onChange(1)}
          onDecrement={() => onChange(-1)}
          onLimitTap={onLimitTap}
        />
      )}
    </li>
  );
}
