import type { ReactNode } from "react";
import { HomeHeader } from "@/components/home/HomeHeader";

/** 참가자용 모바일 틀: 가운데 정렬된 좁은 폭(최대 448px)과 맨 위의 행사 헤더. */
export function MobileShell({
  investorType,
  children,
}: {
  /** 로그인한 참가자의 유형. 이용 안내의 강조 문구를 고르는 데 쓴다. */
  investorType?: "founder" | "external";
  children: ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-md">
      <HomeHeader investorType={investorType} />
      {children}
    </div>
  );
}
