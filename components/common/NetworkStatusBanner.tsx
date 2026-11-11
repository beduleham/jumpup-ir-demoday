"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";

const RECOVERED_MS = 3000;
const RESYNC_TIMEOUT_MS = 5000;
/** 배너 높이. 화면 위쪽에 붙는 다른 요소(잔여 예산 바)가 이만큼 내려와 배너에 가려지지 않는다. */
const HEIGHT_VARIABLE = "--network-banner-height";

type Phase = "hidden" | "offline" | "recovered" | "resync-failed";

/**
 * 참가자 화면 맨 위의 네트워크 안내.
 * 끊기면 경고를 띄우고, 다시 연결되면 서버 상태를 새로 읽은 뒤 3초 동안 복구를 알린다.
 */
export function NetworkStatusBanner() {
  const router = useRouter();
  const online = useNetworkStatus();
  const [phase, setPhase] = useState<Phase>("hidden");
  const wasOffline = useRef(false);
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setPhase("offline");
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;

    let hide: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    (async () => {
      try {
        // 서버가 실제로 응답하는지 확인한 뒤, 서버가 그린 화면(대회 단계 등)을 새로 받는다.
        const response = await fetch("/api/public/state", {
          cache: "no-store",
          signal: AbortSignal.timeout(RESYNC_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        router.refresh();
        if (cancelled) return;
        setPhase("recovered");
        hide = setTimeout(() => setPhase("hidden"), RECOVERED_MS);
      } catch (error) {
        console.error("[network] 복구 후 동기화 실패", error);
        if (!cancelled) setPhase("resync-failed");
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(hide);
    };
  }, [online, router]);

  // 배너가 차지하는 높이를 알려, 위쪽에 붙는 요소들이 그 아래에 자리 잡게 한다.
  useEffect(() => {
    const root = document.documentElement;
    const node = element.current;
    if (!node) {
      root.style.removeProperty(HEIGHT_VARIABLE);
      return;
    }
    const update = () => root.style.setProperty(HEIGHT_VARIABLE, `${node.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty(HEIGHT_VARIABLE);
    };
  }, [phase]);

  if (phase === "hidden") return <div role="status" aria-live="polite" className="sr-only" />;

  const tone =
    phase === "recovered"
      ? "border-success bg-success-surface text-success"
      : "border-warning bg-warning-surface text-warning";

  return (
    <div
      ref={element}
      role="status"
      aria-live={phase === "offline" ? "assertive" : "polite"}
      className={`sticky top-0 z-30 flex items-center gap-2 border-b px-4 py-3 ${tone}`}
    >
      {phase === "recovered" ? (
        <Wifi aria-hidden="true" size={20} strokeWidth={2} className="shrink-0" />
      ) : (
        <WifiOff aria-hidden="true" size={20} strokeWidth={2} className="shrink-0" />
      )}
      <p className="min-w-0 flex-1 font-semibold">
        {phase === "offline"
          ? "네트워크 연결이 끊어졌습니다. 신호가 복구되면 자동으로 동기화됩니다."
          : phase === "recovered"
            ? "네트워크가 정상 복구되었습니다. 최신 데이터를 동기화합니다."
            : "데이터 동기화 실패. 다시 시도해주세요."}
      </p>
      {phase === "resync-failed" ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-warning bg-surface px-3 font-semibold text-warning focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <RefreshCw aria-hidden="true" size={20} strokeWidth={2} />
          새로고침
        </button>
      ) : null}
    </div>
  );
}
