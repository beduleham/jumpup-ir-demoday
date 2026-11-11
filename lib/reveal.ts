// 시상 연출 단계(reveal_step 0~6)가 대형 스크린에서 뜻하는 바.
//   0 발표 대기 / 1 4위 이하 공개 / 2 3위 공개 / 3 2위 공개 / 4 1위 예고 / 5 1위 공개(+축하 효과) / 6 최종 포디엄

export const LOWER_RANKS_STEP = 1;
export const WINNER_TEASER_STEP = 4;
export const WINNER_STEP = 5;
export const PODIUM_STEP = 6;

/** 수상 순위(1~3위) 밖에서 시작하는 첫 순위 */
export const FIRST_NON_AWARD_RANK = 4;

export const AWARD_NAMES: Record<number, string> = { 1: "대상", 2: "최우수상", 3: "우수상" };

/** 이 단계에서 화면 가운데 크게 보여 줄 순위. 없으면 null. */
export function spotlightRank(step: number): 1 | 2 | 3 | null {
  if (step === 2) return 3;
  if (step === 3) return 2;
  if (step === WINNER_STEP) return 1;
  return null;
}

/** 이 단계까지 이미 공개된 수상 순위(큰 순위부터). 가운데 카드와 아래 작은 카드에 쓰인다. */
export function revealedRanks(step: number): Array<1 | 2 | 3> {
  if (step >= WINNER_STEP) return [3, 2, 1];
  if (step >= 3) return [3, 2];
  if (step === 2) return [3];
  return [];
}
