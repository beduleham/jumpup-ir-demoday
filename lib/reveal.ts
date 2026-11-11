// 시상 연출 단계(reveal_step 0~6)가 대형 스크린에서 뜻하는 바.
//   0 발표 대기 / 1 3위 예고 / 2 3위 공개 / 3 2위 공개 / 4 1위 예고 / 5 1위 공개(+축하 효과) / 6 전체 순위표

export const FINAL_TABLE_STEP = 6;
export const WINNER_STEP = 5;

export const AWARD_NAMES: Record<number, string> = { 1: "대상", 2: "최우수상", 3: "우수상" };

/** 이 단계에서 화면 가운데 크게 보여 줄 순위. 없으면 null. */
export function spotlightRank(step: number): 1 | 2 | 3 | null {
  if (step === 2) return 3;
  if (step === 3) return 2;
  if (step === 5) return 1;
  return null;
}

/** 이 단계가 "곧 N위를 발표합니다" 예고라면 그 순위. 아니면 null. */
export function teaserRank(step: number): 1 | 3 | null {
  if (step === 1) return 3;
  if (step === 4) return 1;
  return null;
}

/** 이 단계까지 이미 공개된 순위(큰 순위부터). 가운데 카드와 아래 작은 카드에 쓰인다. */
export function revealedRanks(step: number): Array<1 | 2 | 3> {
  if (step >= 5) return [3, 2, 1];
  if (step >= 3) return [3, 2];
  if (step === 2) return [3];
  return [];
}

// 축하 효과 색. tailwind 토큰(primary, accent, stage.text)과 같은 값이다.
export const CONFETTI_COLORS = ["#005BAC", "#FF6B00", "#F8FAFC"];
