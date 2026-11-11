/** 남은 투자금 비율에 따른 게이지 상태: 여유 있음 / 얼마 남지 않음 / 모두 배분함 */
export type GaugeTone = "normal" | "low" | "done";

/** 남은 금액이 총액의 40% 이상이면 normal, 그보다 적으면 low, 0이면 done. */
export function gaugeTone(remainingUnits: number, totalBudget: number): GaugeTone {
  if (remainingUnits <= 0) return "done";
  return remainingUnits / totalBudget >= 0.4 ? "normal" : "low";
}

/** 게이지 막대의 너비(%). 남은 투자금이 줄수록 줄어든다. */
export function gaugePercent(remainingUnits: number, totalBudget: number): number {
  if (totalBudget <= 0) return 0;
  return Math.min(100, Math.max(0, (remainingUnits / totalBudget) * 100));
}
