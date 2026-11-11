"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/hooks/use-sound";
import type { SfxScope } from "@/lib/sound/sfx";

const LOOK = {
  // 참가자 화면 헤더(밝은 배경)
  light: {
    button:
      "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full px-2 text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    icon: 24,
    prompt: "text-caption font-semibold",
  },
  // 대형 스크린 헤더(어두운 배경). 무대 전체가 창 크기에 맞춰 축소되므로 크게 그린다.
  stage: {
    button:
      "inline-flex min-h-24 min-w-24 items-center justify-center gap-3 rounded-full border-2 border-stage-border px-6 text-stage-text hover:bg-stage-surface focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-accent",
    icon: 44,
    prompt: "text-h1",
  },
};

/**
 * 효과음 켜기/끄기. 브라우저는 첫 조작 전에는 소리를 막으므로,
 * 아직 허용되지 않은 화면에서는 "소리 켜기"로 보이고 누르면 재생이 허용된다.
 */
export function SoundToggleButton({ scope, tone }: { scope: SfxScope; tone: keyof typeof LOOK }) {
  const { muted, unlocked, manager } = useSound(scope);
  const look = LOOK[tone];
  const needsUnlock = !muted && !unlocked;
  const silent = muted || !unlocked;

  async function press() {
    if (needsUnlock) {
      await manager.initAudioContext();
      return;
    }
    const nowMuted = manager.toggleMute();
    if (!nowMuted) await manager.initAudioContext();
  }

  return (
    <button
      type="button"
      onClick={() => void press()}
      aria-pressed={!silent}
      aria-label={silent ? "효과음 켜기" : "효과음 끄기"}
      className={look.button}
    >
      {silent ? (
        <VolumeX aria-hidden="true" size={look.icon} strokeWidth={2} />
      ) : (
        <Volume2 aria-hidden="true" size={look.icon} strokeWidth={2} />
      )}
      {needsUnlock && tone === "stage" ? <span className={look.prompt}>소리 켜기</span> : null}
    </button>
  );
}
