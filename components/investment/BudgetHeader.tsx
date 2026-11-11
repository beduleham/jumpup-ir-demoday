import { CircleCheck, LogOut } from "lucide-react";
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
      className="sticky top-0 z-10 -mx-4 border-b border-border bg-surface px-4 py-3"
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

      <p className={`mt-2 ${spentAll ? "text-success" : "text-text"}`}>
        남은 투자금{" "}
        <strong className="text-h2">{remaining}억 원</strong> / 총 {budgetUnits}억 원
      </p>
      <div
        role="progressbar"
        aria-label="사용한 가상 투자금"
        aria-valuemin={0}
        aria-valuemax={budgetUnits}
        aria-valuenow={investedUnits}
        aria-valuetext={`${budgetUnits}억 원 중 ${investedUnits}억 원 배분`}
        className="mt-2 h-2 overflow-hidden rounded-sm bg-border"
      >
        <div
          className={`h-full ${spentAll ? "bg-success" : "bg-primary"}`}
          style={{ width: `${(investedUnits / budgetUnits) * 100}%` }}
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
