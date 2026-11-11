import type { ReactNode } from "react";

/** 대형 스크린용 틀: 헤더·메뉴 없이 화면 전체를 덮는 다크 배경. 무대(16:9)는 안쪽 화면이 그린다. */
export function DisplayShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-stage-body text-stage-text">{children}</div>;
}
