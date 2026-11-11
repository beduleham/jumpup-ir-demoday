"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HomeErrorView } from "@/components/home/HomeErrorView";
import { publicStateResponseSchema, stateSnapshot } from "@/types/competition";

const POLL_INTERVAL_MS = 1000;
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
 * 공개 상태 API를 주기적으로 확인해, 서버가 그린 화면과 달라지면 새로 그리게 한다.
 * 연결이 끊기면 안내와 [다시 시도]를 보여 준다.
 */
export function StateWatcher({ snapshot, statusLabel }: { snapshot: string; statusLabel: string }) {
  const router = useRouter();
  const [disconnected, setDisconnected] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const failures = useRef(0);
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const latest = await fetchSnapshot();
      failures.current = 0;
      setDisconnected(false);
      if (latest !== snapshot) router.refresh();
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

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [check]);

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
      {disconnected ? (
        <div className="sticky bottom-0 p-4">
          <HomeErrorView onRetry={retry} pending={retrying} />
        </div>
      ) : null}
    </>
  );
}
