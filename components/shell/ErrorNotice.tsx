"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

/**
 * 오류 화면의 "다시 시도" 동작: 페이지를 통째로 다시 불러온다.
 * Next.js의 reset()은 화면만 다시 그릴 뿐 서버에 다시 요청하지 않아, 서버에서 난 오류는 그대로 남는다.
 * 오류 화면에서는 보존할 상태가 없으므로 가장 확실한 전체 새로고침을 쓴다.
 */
export function reloadPage(): void {
  window.location.reload();
}

/** 화면 렌더링 중 오류가 났을 때의 공통 안내. 원인은 콘솔에 남기고 사용자에게는 다음 행동만 알린다. */
export function ErrorNotice({
  error,
  title,
  body,
  actionLabel,
  onAction,
}: {
  error: Error;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  useEffect(() => {
    console.error("[shell] 화면 렌더링 오류", error);
  }, [error]);

  return (
    <section role="alert" className="rounded-xl border border-danger bg-danger-surface p-4">
      <p className="flex items-start gap-2 text-h3 font-semibold text-danger">
        <TriangleAlert aria-hidden="true" size={20} strokeWidth={2} className="mt-0.5 shrink-0" />
        {title}
      </p>
      <p className="mt-1 text-text">{body}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-h3 text-primary-foreground hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <RefreshCw aria-hidden="true" size={20} strokeWidth={2} />
        {actionLabel}
      </button>
    </section>
  );
}
