import { describe, expect, it } from "vitest";
import { revealedRanks, spotlightRank, teaserRank } from "@/lib/reveal";
import { REVEAL_STEP_LABELS } from "@/types/admin";

describe("시상 연출 단계", () => {
  it("0~6단계가 예고 → 공개 순서로 이어진다", () => {
    const steps = [0, 1, 2, 3, 4, 5, 6].map((step) => ({
      teaser: teaserRank(step),
      spotlight: spotlightRank(step),
      revealed: revealedRanks(step),
    }));
    expect(steps).toEqual([
      { teaser: null, spotlight: null, revealed: [] },
      { teaser: 3, spotlight: null, revealed: [] },
      { teaser: null, spotlight: 3, revealed: [3] },
      { teaser: null, spotlight: 2, revealed: [3, 2] },
      { teaser: 1, spotlight: null, revealed: [3, 2] },
      { teaser: null, spotlight: 1, revealed: [3, 2, 1] },
      { teaser: null, spotlight: null, revealed: [3, 2, 1] },
    ]);
  });

  it("1위는 5단계 전에는 어디에도 나오지 않는다", () => {
    for (const step of [0, 1, 2, 3, 4]) {
      expect(revealedRanks(step)).not.toContain(1);
      expect(spotlightRank(step)).not.toBe(1);
    }
  });

  it("관리자 콘솔의 단계 이름이 7단계 모두에 있다", () => {
    expect(REVEAL_STEP_LABELS).toHaveLength(7);
  });
});
