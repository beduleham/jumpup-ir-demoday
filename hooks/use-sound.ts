"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getSoundManager, type SfxScope, type SoundManager, type SoundSnapshot } from "@/lib/sound/sfx";

const SERVER_SNAPSHOT: SoundSnapshot = { muted: false, unlocked: false };

/** 이 화면 종류의 효과음 관리자와 현재 음소거·재생 가능 상태. */
export function useSound(scope: SfxScope): SoundSnapshot & { manager: SoundManager } {
  const manager = getSoundManager(scope);
  const snapshot = useSyncExternalStore(manager.subscribe, manager.getSnapshot, () => SERVER_SNAPSHOT);

  useEffect(() => {
    manager.arm();
  }, [manager]);

  return { ...snapshot, manager };
}
