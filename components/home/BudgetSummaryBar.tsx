import { Building2, Coins } from "lucide-react";
import type { SessionInvestor } from "@/types/competition";

function participantLabel(session: SessionInvestor): string {
  const role = session.investor_type === "founder" ? "대표" : "심사위원";
  return `[${session.investor_no}번] ${session.investor_name} ${role}`;
}

export function BudgetSummaryBar({
  session,
  budgetUnits,
}: {
  session: SessionInvestor;
  budgetUnits: number;
}) {
  return (
    <section
      aria-label="참가자 정보"
      className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3"
    >
      <div className="min-w-0">
        <p className="text-h3 text-text">{participantLabel(session)}</p>
        {session.company_name ? (
          <p className="mt-1 inline-flex items-center gap-1 rounded-sm bg-body px-2 py-1 text-caption text-text-muted">
            <Building2 aria-hidden="true" size={14} strokeWidth={2} />
            소속 기업 {session.company_name}
          </p>
        ) : null}
      </div>
      <p className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-h3 text-primary-foreground">
        <Coins aria-hidden="true" size={20} strokeWidth={2} />
        <span className="text-caption">가상 투자금</span>
        <span className="font-semibold">{budgetUnits}억 원</span>
      </p>
    </section>
  );
}
