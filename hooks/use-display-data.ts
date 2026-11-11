"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useStateChangeSignal, type RealtimeLink } from "@/hooks/use-state-change-signal";
import { publicStateResponseSchema, stateSnapshot, type PublicState } from "@/types/competition";
import { publicResultsSchema, type PublicResults } from "@/types/results";

// 실시간 알림을 구독 중이면 놓친 알림에 대비해 3초마다 확인한다.
// 구독하지 못하면 0.5초마다 확인한다(대형 스크린은 한두 대뿐이라 부담이 없고, 전환 효과까지 1초 안에 끝내기 위함).
const POLL_WITH_REALTIME_MS = 3000;
const POLL_WITHOUT_REALTIME_MS = 500;
// 기업 등록처럼 대회 상태를 바꾸지 않는 변경도 따라가도록, 결과(기업 목록)는 주기적으로 다시 읽는다.
const RESULTS_MAX_AGE_MS = 10_000;
const REQUEST_TIMEOUT_MS = 3000;
const FAILURES_BEFORE_ALERT = 2;

const resultsResponseSchema = z.object({ success: z.literal(true), data: publicResultsSchema });

export interface DisplayData {
  state: PublicState;
  results: PublicResults;
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(path, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  return response.json();
}

async function fetchState(): Promise<PublicState> {
  const body = publicStateResponseSchema.parse(await getJson("/api/public/state"));
  if (!body.success) throw new Error(body.error.message);
  return body.data;
}

async function fetchResults(): Promise<PublicResults> {
  return resultsResponseSchema.parse(await getJson("/api/public/results")).data;
}

/**
 * 대형 스크린이 보여 줄 데이터. 대회 상태를 가볍게 확인하다가 달라졌을 때만 결과를 다시 읽는다.
 * failed가 true여도 확인은 계속되며, 서버에 다시 닿으면 스스로 복구된다.
 */
export function useDisplayData(): { data: DisplayData | null; failed: boolean; link: RealtimeLink } {
  const [data, setData] = useState<DisplayData | null>(null);
  const [failed, setFailed] = useState(false);
  const snapshot = useRef<string | null>(null);
  const resultsAt = useRef(0);
  const failures = useRef(0);
  const inFlight = useRef(false);
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
        const state = await fetchState();
        const next = stateSnapshot(state);
        if (next !== snapshot.current || Date.now() - resultsAt.current > RESULTS_MAX_AGE_MS) {
          const results = await fetchResults();
          snapshot.current = next;
          resultsAt.current = Date.now();
          setData({ state, results });
        }
        failures.current = 0;
        setFailed(false);
      } while (again.current);
    } catch (error) {
      failures.current += 1;
      if (failures.current >= FAILURES_BEFORE_ALERT) {
        console.error("[display] 화면 정보 조회 실패", error);
        setFailed(true);
      }
    } finally {
      inFlight.current = false;
    }
  }, []);

  const link = useStateChangeSignal(check);

  useEffect(() => {
    void check();
    const timer = setInterval(
      () => void check(),
      link === "live" ? POLL_WITH_REALTIME_MS : POLL_WITHOUT_REALTIME_MS,
    );
    return () => clearInterval(timer);
  }, [check, link]);

  return { data, failed, link };
}
