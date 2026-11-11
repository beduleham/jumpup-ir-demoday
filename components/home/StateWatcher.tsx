"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HomeErrorView } from "@/components/home/HomeErrorView";
import { useStateChangeSignal } from "@/hooks/use-state-change-signal";
import { publicStateResponseSchema, stateSnapshot } from "@/types/competition";

// 실시간 알림을 구독 중이면 놓친 알림에 대비한 확인만 느리게 하고,
// 구독하지 못하고 있으면 1초마다 확인해 단계 전환을 따라간다.
const POLL_WITH_REALTIME_MS = 5000;
const POLL_WITHOUT_REALTIME_MS = 1000;
const REQUEST_TIMEOUT_MS = 3000;
// 한 번의 순간적인 실패로 경고가 깜빡이지 않도록 연속 실패 횟수를 본다.
const FAILURES_BEFORE_ALERT = 2;

async function fetchSnapshot(): Promise<string> {
  const response = await fetch("/api/public/state", {
    cache: "no-store",
    // 서버가 DB 재시도로 오래 붙잡혀 있어도 끊긴 것으로 보고 안내를 띄운다.
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = publicStateResponseSchema.parse(await response.json());
  if (!body.success) throw new Error(body.error.message);
  return stateSnapshot(body.data);
}

/**
 * 서버가 그린 화면이 최신 대회 상태와 같은지 확인하고, 달라졌으면 새로 그리게 한다.
 * 확인 시점: 실시간 알림을 받았을 때, 그리고 주기적으로(폴백).
 * 서버에 닿지 않으면 안내와 [다시 시도]를 보여 준다.
 */
export function StateWatcher({ snapshot, statusLabel }: { snapshot: string; statusLabel: string }) {
  const router = useRouter();
  const [disconnected, setDisconnected] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const failures = useRef(0);
  const inFlight = useRef(false);
  // 확인 중에 알림이 또 오면, 끝난 뒤 한 번 더 확인한다(그 사이의 변경을 놓치지 않기 위해).
  const again = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    try {
      do {
        again.current = false;
        const latest = await fetchSnapshot();
        failures.current = 0;
        setDisconnected(false);
        if (latest !== snapshot) router.refresh();
      } while (again.current);
    } catch (error) {
      failures.current += 1;
      if (failures.current >= FAILURES_BEFORE_ALERT) {
        console.error("[home] 대회 상태 확인 실패", error);
        setDisconnected(true);
      }
    } finally {
      inFlight.current = false;
    }
  }, [router, snapshot]);

  const link = useStateChangeSignal(check);

  useEffect(() => {
    const interval = link === "live" ? POLL_WITH_REALTIME_MS : POLL_WITHOUT_REALTIME_MS;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, interval);
    return () => clearInterval(timer);
  }, [check, link]);

  async function retry() {
    setRetrying(true);
    // 버튼을 누른 시도는 한 번 실패해도 바로 결과를 보여 준다.
    failures.current = FAILURES_BEFORE_ALERT - 1;
    await check();
    setRetrying(false);
  }

  return (
    <>
      <p role="status" className="sr-only">
        현재 대회 단계: {statusLabel}
      </p>
      {link === "lost" && !disconnected ? (
        <p role="status" className="px-4 pb-2 text-center text-caption text-text-muted">
          실시간 연결 재시도 중...
        </p>
      ) : null}
      {disconnected ? (
        <div className="sticky bottom-0 p-4">
          <HomeErrorView onRetry={retry} pending={retrying} />
        </div>
      ) : null}
    </>
  );
}
