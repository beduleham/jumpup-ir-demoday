import { describe, expect, it } from "vitest";
import { gaugePercent, gaugeTone } from "@/lib/budget-gauge";

describe("잔여 예산 게이지", () => {
  it("남은 금액이 40% 이상이면 여유, 그보다 적으면 경고, 0이면 완료로 본다", () => {
    expect([10, 4].map((left) => gaugeTone(left, 10))).toEqual(["normal", "normal"]);
    expect([3, 1].map((left) => gaugeTone(left, 10))).toEqual(["low", "low"]);
    expect(gaugeTone(0, 10)).toBe("done");
  });

  it("막대 너비는 남은 금액의 비율이며 0~100%를 벗어나지 않는다", () => {
    expect([10, 3, 0].map((left) => gaugePercent(left, 10))).toEqual([100, 30, 0]);
    expect(gaugePercent(12, 10)).toBe(100);
    expect(gaugePercent(-1, 10)).toBe(0);
    expect(gaugePercent(5, 0)).toBe(0);
  });
});
