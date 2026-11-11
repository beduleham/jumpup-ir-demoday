"use client";

import { useEffect } from "react";
import { reloadPage } from "@/components/shell/ErrorNotice";

const RETRY_MS = 5000;

// 대형 스크린에는 누를 사람이 없으므로 버튼 대신 스스로 다시 시도한다.
export default function ResultError({ error }: { error: Error }) {
  useEffect(() => {
    console.error("[display] 화면 렌더링 오류", error);
    const timer = setTimeout(reloadPage, RETRY_MS);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-display-2">스크린 디스플레이 연결 지연</p>
      <p className="text-h1 text-stage-muted">잠시 후 자동으로 다시 연결합니다.</p>
    </div>
  );
}
