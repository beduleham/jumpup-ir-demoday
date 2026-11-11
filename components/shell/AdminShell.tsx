import { Home } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** 관리자용 틀: 상단 콘솔 바와 넓고 조밀한 본문. 로그인·로그아웃은 본문(콘솔)이 처리한다. */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 md:px-6">
          <h1 className="text-h2 text-text">광명 점프업 관리자 콘솔</h1>
          <Link
            href="/"
            className="inline-flex min-h-11 min-w-11 items-center gap-1 rounded-md px-3 text-body text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Home aria-hidden="true" size={20} strokeWidth={2} />
            참가자 홈
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl p-4 md:p-6">{children}</div>
    </div>
  );
}
