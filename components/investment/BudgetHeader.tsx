import { CircleCheck, LogOut } from "lucide-react";
import { BudgetGaugeBar } from "@/components/investment/BudgetGaugeBar";
import { STATUS_LABELS, type CompetitionStatus, type SessionInvestor } from "@/types/competition";

function identityLabel(investor: SessionInvestor): string {
  return investor.investor_type === "founder"
    ? `${investor.investor_no}번 ${investor.investor_name} 대표 (${investor.company_name ?? "소속 기업"})`
    : `${investor.investor_no}번 ${investor.investor_name} 심사위원 (외부 투자자)`;
}

export function BudgetHeader({
  investor,
  status,
  budgetUnits,
  investedUnits,
  saving,
  onLogout,
}: {
  investor: SessionInvestor;
  status: CompetitionStatus;
  budgetUnits: number;
  investedUnits: number;
  saving: boolean;
  onLogout: () => void;
}) {
  const remaining = budgetUnits - investedUnits;
  const spentAll = remaining === 0;

  return (
    <section
      aria-label="내 투자 현황"
      className="sticky top-0 z-10 -mx-4 border-b border-border bg-surface px-4 py-3 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-h3 text-text">{identityLabel(investor)}</p>
          <p className="mt-1 inline-block rounded-sm bg-body px-2 py-1 text-caption font-semibold text-text">
            {STATUS_LABELS[status]}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-caption text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <LogOut aria-hidden="true" size={20} strokeWidth={2} />
          로그아웃
        </button>
      </div>

      <div className="mt-2">
        <BudgetGaugeBar
          totalBudget={budgetUnits}
          investedUnits={investedUnits}
          remainingUnits={remaining}
          status={status}
        />
      </div>
      <p aria-live="polite" className="mt-1 min-h-5 text-caption text-text-muted">
        {spentAll ? (
          <span className="inline-flex items-center gap-1 text-success">
            <CircleCheck aria-hidden="true" size={14} strokeWidth={2} />
            가상 투자금을 모두 배분했습니다. 더 투자하려면 다른 기업의 금액을 줄여 주세요.
          </span>
        ) : saving ? (
          "저장하는 중…"
        ) : null}
      </p>
    </section>
  );
}
