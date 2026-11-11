// 이 기기가 서버에 닿는지 추적한다.
// 브라우저의 online/offline 이벤트만으로는 "Wi-Fi에는 붙어 있지만 인터넷이 안 되는" 경우를 놓치므로,
// 가벼운 요청(/api/health)이 실제로 서버에 닿는지로 한 번 더 확인한다.

const PROBE_URL = "/api/health";
const PROBE_TIMEOUT_MS = 4000;
const TICK_MS = 3000;
// 연결되어 있을 때는 5번째 틱마다(15초) 확인하고, 끊겨 있을 때는 매 틱(3초) 확인해 복구를 빨리 알아챈다.
const TICKS_BETWEEN_PROBES_WHEN_ONLINE = 5;

export interface NetworkMonitor {
  isOnline(): boolean;
  subscribe(listener: () => void): () => void;
  /** 브라우저가 연결이 끊겼다고 알렸을 때 */
  handleOffline(): void;
  /** 브라우저가 연결되었다고 알렸거나, 요청이 실패해 실제 상태를 확인해야 할 때 */
  verify(): Promise<void>;
  /** 주기 타이머가 부른다 */
  tick(): Promise<void>;
}

/** probe는 서버에 닿으면 true, 닿지 못하면 false를 돌려준다. */
export function createNetworkMonitor(probe: () => Promise<boolean>, initiallyOnline = true): NetworkMonitor {
  let online = initiallyOnline;
  let ticks = 0;
  let probing: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function set(next: boolean) {
    if (online === next) return;
    online = next;
    for (const listener of listeners) listener();
  }

  function verify(): Promise<void> {
    // 확인이 이미 진행 중이면 그 결과를 함께 기다린다.
    probing ??= probe()
      .then(set)
      .finally(() => {
        probing = null;
      });
    return probing;
  }

  return {
    isOnline: () => online,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    handleOffline: () => set(false),
    verify,
    async tick() {
      ticks += 1;
      if (!online || ticks % TICKS_BETWEEN_PROBES_WHEN_ONLINE === 0) await verify();
    },
  };
}

/** 어떤 응답이든 받으면 서버에 닿은 것이다(503이어도 네트워크는 살아 있다). */
async function probeServer(): Promise<boolean> {
  try {
    await fetch(PROBE_URL, { cache: "no-store", signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    return true;
  } catch {
    // 닿지 못한 것 자체가 확인 결과다. 호출한 쪽이 오프라인 안내를 띄운다.
    return false;
  }
}

let shared: NetworkMonitor | null = null;

/** 브라우저에서 한 번만 만들어 모든 화면이 함께 쓰는 감시기. */
export function getNetworkMonitor(): NetworkMonitor {
  if (shared) return shared;
  const monitor = createNetworkMonitor(probeServer, navigator.onLine);
  window.addEventListener("offline", monitor.handleOffline);
  window.addEventListener("online", () => void monitor.verify());
  window.addEventListener("focus", () => void monitor.verify());
  setInterval(() => {
    if (document.visibilityState === "visible") void monitor.tick();
  }, TICK_MS);
  shared = monitor;
  return monitor;
}

/** 요청이 네트워크 오류로 실패했을 때 부른다. 실제로 끊겼는지 바로 확인한다. */
export function reportRequestFailure(): void {
  if (typeof window !== "undefined") void getNetworkMonitor().verify();
}
