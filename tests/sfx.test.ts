import { describe, expect, it } from "vitest";
import { revealSound } from "@/lib/reveal";
import { getSoundManager } from "@/lib/sound/sfx";

describe("효과음 관리자 (소리를 낼 수 없는 환경)", () => {
  it("오디오가 없는 환경에서도 재생·허용 요청이 예외 없이 지나간다", async () => {
    const manager = getSoundManager("mobile");
    expect(() => manager.play("invest_up")).not.toThrow();
    expect(() => manager.play("reveal_fanfare")).not.toThrow();
    await expect(manager.initAudioContext()).resolves.toBe(false);
    expect(manager.getSnapshot().unlocked).toBe(false);
  });

  it("음소거를 바꾸면 상태가 바뀌고 구독자에게 알린다", () => {
    const manager = getSoundManager("display");
    let calls = 0;
    const unsubscribe = manager.subscribe(() => {
      calls += 1;
    });
    expect(manager.getSnapshot().muted).toBe(false);
    expect(manager.toggleMute()).toBe(true);
    expect(manager.getSnapshot().muted).toBe(true);
    expect(manager.toggleMute()).toBe(false);
    expect(calls).toBe(2);
    unsubscribe();
  });

  it("화면 종류별로 음소거를 따로 가진다", () => {
    getSoundManager("mobile").setMuted(true);
    expect(getSoundManager("mobile").getSnapshot().muted).toBe(true);
    expect(getSoundManager("display").getSnapshot().muted).toBe(false);
    getSoundManager("mobile").setMuted(false);
  });
});

describe("시상 단계 효과음", () => {
  it("3위·2위 발표와 1위 예고는 드럼롤, 1위 발표는 팡파레, 나머지는 전환음이다", () => {
    expect(revealSound(0, 1, true)).toBe("step_transition");
    expect(revealSound(1, 2, true)).toBe("reveal_drumroll");
    expect(revealSound(2, 3, true)).toBe("reveal_drumroll");
    expect(revealSound(3, 4, true)).toBe("reveal_drumroll");
    expect(revealSound(4, 5, true)).toBe("reveal_fanfare");
    expect(revealSound(5, 6, true)).toBe("step_transition");
    expect(revealSound(3, 2, true)).toBe("reveal_drumroll");
  });

  it("단계가 그대로면 1위 발표 단계의 재격발일 때만 팡파레를 낸다", () => {
    expect(revealSound(5, 5, true)).toBe("reveal_fanfare");
    expect(revealSound(5, 5, false)).toBeNull();
    expect(revealSound(6, 6, true)).toBeNull();
    expect(revealSound(2, 2, true)).toBeNull();
  });
});
