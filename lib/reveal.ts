// 시상 연출 단계(reveal_step 0~6)가 대형 스크린에서 뜻하는 바.
//   0 발표 대기 / 1 4위 이하 공개 / 2 3위 공개 / 3 2위 공개 / 4 1위 예고 / 5 1위 공개(+축하 효과) / 6 최종 포디엄

export const LOWER_RANKS_STEP = 1;
export const WINNER_TEASER_STEP = 4;
export const WINNER_STEP = 5;
export const PODIUM_STEP = 6;

/** 수상 순위(1~3위) 밖에서 시작하는 첫 순위 */
export const FIRST_NON_AWARD_RANK = 4;

export const AWARD_NAMES: Record<number, string> = { 1: "대상", 2: "최우수상", 3: "우수상" };

/**
 * 참가자 휴대폰에 최종 결과(순위, 유치액)를 보여 줘도 되는 시점인지.
 * 결과 공개 직후가 아니라 대형 스크린에서 1위까지 발표된 뒤부터 보여 준다.
 * 그 전에 보여 주면 무대에서 차례로 공개하는 순위를 휴대폰이 먼저 알려 주게 된다.
 */
export function mobileResultsVisible(status: string, revealStep: number): boolean {
  return status === "revealed" && revealStep >= WINNER_STEP;
}

/**
 * 시상 단계가 from에서 to로 바뀌었을 때 대형 스크린이 낼 효과음. 낼 소리가 없으면 null.
 *   3위·2위 발표와 1위 예고: 드럼롤 / 1위 발표: 팡파레 / 그 밖의 단계 이동: 짧은 전환음
 * 단계는 그대로인데 설정만 다시 저장된 경우(refired)는 1위 발표 단계의 축하 효과 재격발이므로 팡파레를 다시 낸다.
 */
export function revealSound(
  from: number,
  to: number,
  refired: boolean,
): "step_transition" | "reveal_drumroll" | "reveal_fanfare" | null {
  if (from === to) return refired && to === WINNER_STEP ? "reveal_fanfare" : null;
  if (to === WINNER_STEP) return "reveal_fanfare";
  if (to === WINNER_TEASER_STEP || spotlightRank(to) !== null) return "reveal_drumroll";
  return "step_transition";
}

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
