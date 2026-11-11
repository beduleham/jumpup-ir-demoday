"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

export function HomeErrorView({ onRetry, pending }: { onRetry: () => void; pending: boolean }) {
  return (
    <section role="alert" className="rounded-xl border border-danger bg-danger-surface p-4">
      <p className="flex items-start gap-2 text-h3 font-semibold text-danger">
        <TriangleAlert aria-hidden="true" size={20} strokeWidth={2} className="mt-0.5 shrink-0" />
        대회 상태 정보를 불러올 수 없습니다.
      </p>
      <p className="mt-1 text-text">네트워크 연결을 확인해 주세요.</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={pending}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-h3 text-primary-foreground hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        <RefreshCw aria-hidden="true" size={20} strokeWidth={2} />
        {pending ? "다시 불러오는 중…" : "다시 시도"}
      </button>
    </section>
  );
}
