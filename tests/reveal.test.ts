import { describe, expect, it } from "vitest";
import {
  LOWER_RANKS_STEP,
  mobileResultsVisible,
  PODIUM_STEP,
  revealedRanks,
  spotlightRank,
  WINNER_STEP,
  WINNER_TEASER_STEP,
} from "@/lib/reveal";
import { REVEAL_STEP_LABELS } from "@/types/admin";

describe("시상 연출 단계", () => {
  it("0~6단계가 대기 → 4위 이하 → 3위 → 2위 → 1위 예고 → 1위 → 포디엄 순서로 이어진다", () => {
    const steps = [0, 1, 2, 3, 4, 5, 6].map((step) => ({
      spotlight: spotlightRank(step),
      revealed: revealedRanks(step),
    }));
    expect(steps).toEqual([
      { spotlight: null, revealed: [] },
      { spotlight: null, revealed: [] },
      { spotlight: 3, revealed: [3] },
      { spotlight: 2, revealed: [3, 2] },
      { spotlight: null, revealed: [3, 2] },
      { spotlight: 1, revealed: [3, 2, 1] },
      { spotlight: null, revealed: [3, 2, 1] },
    ]);
    expect([LOWER_RANKS_STEP, WINNER_TEASER_STEP, WINNER_STEP, PODIUM_STEP]).toEqual([1, 4, 5, 6]);
  });

  it("1위는 5단계 전에는 어디에도 나오지 않는다", () => {
    for (const step of [0, 1, 2, 3, 4]) {
      expect(revealedRanks(step)).not.toContain(1);
      expect(spotlightRank(step)).not.toBe(1);
    }
  });

  it("휴대폰의 최종 결과는 결과 공개 단계에서만 보인다", () => {
    for (const status of ["ready", "pitching", "open", "closed"]) {
      expect(mobileResultsVisible(status)).toBe(false);
    }
    expect(mobileResultsVisible("revealed")).toBe(true);
  });

  it("관리자 콘솔의 단계 이름이 7단계 모두에 있고 화면 동작과 맞는다", () => {
    expect(REVEAL_STEP_LABELS).toHaveLength(7);
    expect(REVEAL_STEP_LABELS[LOWER_RANKS_STEP]).toBe("4위 이하 공개");
    expect(REVEAL_STEP_LABELS[WINNER_STEP]).toBe("1위 발표");
    expect(REVEAL_STEP_LABELS[PODIUM_STEP]).toBe("최종 포디엄");
  });
});
