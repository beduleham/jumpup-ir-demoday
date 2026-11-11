"use client";

import { motion } from "framer-motion";
import { gaugePercent, gaugeTone, type GaugeTone } from "@/lib/budget-gauge";
import type { CompetitionStatus } from "@/types/competition";

const TONE: Record<GaugeTone, { bar: string; text: string }> = {
  normal: { bar: "bg-primary", text: "text-text" },
  low: { bar: "bg-warning-icon", text: "text-warning" },
  done: { bar: "bg-success", text: "text-success" },
};

/**
 * 투자할 수 없는 단계에서 게이지 옆에 붙는 표시. 투자 오픈 중에는 붙이지 않는다.
 * 투자 마감 단계는 바로 위의 단계 표시가 이미 "투자 마감"이라 되풀이하지 않는다.
 */
function lockLabel(status: CompetitionStatus): string | null {
  if (status === "open" || status === "closed") return null;
  return status === "revealed" ? "투자 마감" : "투자 대기";
}

/** 남은 가상 투자금을 숫자와 막대로 보여 준다. 막대는 남은 금액만큼 차 있고, 투자할수록 줄어든다. */
export function BudgetGaugeBar({
  totalBudget,
  investedUnits,
  remainingUnits,
  status,
}: {
  totalBudget: number;
  investedUnits: number;
  remainingUnits: number;
  status: CompetitionStatus;
}) {
  const tone = TONE[gaugeTone(remainingUnits, totalBudget)];
  const lock = lockLabel(status);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className={tone.text}>
          남은 투자금 <strong className="text-h2">{remainingUnits}억 원</strong> / 총 {totalBudget}억 원
        </p>
        {lock ? (
          <p className="rounded-sm bg-body px-2 py-1 text-caption font-semibold text-text-muted">{lock}</p>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label="남은 가상 투자금"
        aria-valuemin={0}
        aria-valuemax={totalBudget}
        aria-valuenow={remainingUnits}
        aria-valuetext={`${totalBudget}억 원 중 ${remainingUnits}억 원 남음, ${investedUnits}억 원 배분`}
        className="mt-2 h-3 overflow-hidden rounded-sm bg-border"
      >
        <motion.div
          className={`h-full rounded-sm ${tone.bar}`}
          initial={false}
          animate={{ width: `${gaugePercent(remainingUnits, totalBudget)}%` }}
          transition={{ type: "tween", duration: 0.3 }}
        />
      </div>
    </div>
  );
}
