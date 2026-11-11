"use client";

import { useEffect, useRef, useState } from "react";
import { STATE_CHANNEL, STATE_EVENT } from "@/lib/realtime-channel";
import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * off: 실시간을 쓰지 않음 / connecting: 아직 연결 전 / live: 구독 중 / lost: 연결됐다가 끊겨 재시도 중
 */
export type RealtimeLink = "off" | "connecting" | "live" | "lost";

/**
 * 대회 상태 변경 알림을 구독한다. 알림이 오거나 (재)연결되면 onSignal을 부른다.
 * 알림의 내용은 쓰지 않는다: 공개 채널은 누구나 보낼 수 있으므로, 실제 상태는 서버 API로 다시 확인해야 한다.
 */
export function useStateChangeSignal(onSignal: () => void): RealtimeLink {
  const [link, setLink] = useState<RealtimeLink>("off");
  const handler = useRef(onSignal);

  useEffect(() => {
    handler.current = onSignal;
  }, [onSignal]);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;

    let wasLive = false;
    setLink("connecting");

    const channel = supabase
      .channel(STATE_CHANNEL)
      .on("broadcast", { event: STATE_EVENT }, () => handler.current())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          wasLive = true;
          setLink("live");
          // 끊겨 있던 동안 놓친 변경이 있을 수 있으므로 연결되자마자 한 번 확인한다.
          handler.current();
        } else {
          setLink(wasLive ? "lost" : "connecting");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return link;
}
