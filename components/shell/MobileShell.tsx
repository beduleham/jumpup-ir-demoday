import type { ReactNode } from "react";
import { HomeHeader } from "@/components/home/HomeHeader";

/** 참가자용 모바일 틀: 가운데 정렬된 좁은 폭(최대 448px)과 맨 위의 행사 헤더. */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md">
      <HomeHeader />
      {children}
    </div>
  );
}
