"use client";

import { useSyncExternalStore } from "react";
import { getNetworkMonitor } from "@/lib/network-status";

function subscribe(listener: () => void): () => void {
  return getNetworkMonitor().subscribe(listener);
}

/** 이 기기가 서버에 닿는지. 서버 렌더링과 첫 그리기에서는 연결된 것으로 본다. */
export function useNetworkStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getNetworkMonitor().isOnline(),
    () => true,
  );
}
