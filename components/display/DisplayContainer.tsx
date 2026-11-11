"use client";

import { CircleCheck, RefreshCw, TriangleAlert, WifiOff } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { SoundToggleButton } from "@/components/sound/SoundToggleButton";
import { useNetworkStatus } from "@/hooks/use-network-status";
import type { RealtimeLink } from "@/hooks/use-state-change-signal";
import logoCenter from "@/public/logo_center.png";
import logoGwangmyeong from "@/public/logo_gwangmyeong.png";

// 화면은 항상 1920×1080으로 그리고, 창 크기에 맞춰 통째로 축소·확대한다(남는 곳은 레터박스).
const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;

function useStageScale(): number | null {
  const [scale, setScale] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
}

function useSeoulClock(): string {
  const [time, setTime] = useState("");
  useEffect(() => {
    const format = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const update = () => setTime(format.format(new Date()));
    update();
    const timer = setInterval(update, 10_000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

function ConnectionBadge({ link, failed }: { link: RealtimeLink; failed: boolean }) {
  const online = useNetworkStatus();
  if (!online) {
    return (
      <p role="status" className="inline-flex items-center gap-2 rounded-md bg-stage-border px-4 py-2 text-h2 text-stage-text">
        <WifiOff aria-hidden="true" size={28} strokeWidth={2} />
        연결 끊김 - 재연결 중...
      </p>
    );
  }
  if (failed || link === "lost") {
    return (
      <p role="status" className="inline-flex items-center gap-2 rounded-md border border-warning-icon px-4 py-2 text-h2 text-warning-icon">
        <TriangleAlert aria-hidden="true" size={28} strokeWidth={2} />
        실시간 연결 재시도 중...
      </p>
    );
  }
  if (link === "live") {
    return (
      <p className="inline-flex items-center gap-2 text-h2 text-stage-muted">
        <CircleCheck aria-hidden="true" size={28} strokeWidth={2} />
        실시간 연결됨
      </p>
    );
  }
  return (
    <p className="inline-flex items-center gap-2 text-h2 text-stage-muted">
      <RefreshCw aria-hidden="true" size={28} strokeWidth={2} />
      자동 갱신 중
    </p>
  );
}

export function DisplayContainer({
  statusLabel,
  link,
  failed,
  children,
}: {
  statusLabel: string | null;
  link: RealtimeLink;
  failed: boolean;
  children: ReactNode;
}) {
  const scale = useStageScale();
  const time = useSeoulClock();

  return (
    <div className="fixed inset-0 overflow-hidden bg-stage-body bg-stage-backdrop text-stage-text">
      <div
        className={`absolute left-1/2 top-1/2 flex flex-col ${scale === null ? "invisible" : ""}`}
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale ?? 1})`,
        }}
      >
        <header className="flex items-center justify-between border-b border-stage-border px-16 py-6">
          <div className="flex items-center gap-6">
            {/* 로고 원본이 흰 배경이라 흰 판 위에 올린다. */}
            <div className="flex items-center gap-4 rounded-xl bg-surface px-4 py-2">
              <Image src={logoGwangmyeong} alt="광명시" priority className="h-16 w-auto" />
              <Image src={logoCenter} alt="광명시청년창업지원센터" priority className="h-16 w-auto" />
            </div>
            <p className="text-h1 text-stage-text">2026 광명 스타트업 점프업 모의 IR 데모데이</p>
          </div>
          <div className="flex items-center gap-6">
            <ConnectionBadge link={link} failed={failed} />
            {statusLabel ? (
              <p className="rounded-md bg-primary px-5 py-2 text-h1 text-primary-foreground">{statusLabel}</p>
            ) : null}
            <p className="min-w-24 text-right text-h1 tabular-nums text-stage-muted">{time}</p>
            <SoundToggleButton scope="display" tone="stage" />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col px-16 py-10">{children}</main>
      </div>
    </div>
  );
}
