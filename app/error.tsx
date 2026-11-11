"use client";

import { ErrorNotice, reloadPage } from "@/components/shell/ErrorNotice";

// 영역별 오류 화면이 없는 경로에서 쓰이는 공통 오류 화면.
export default function GlobalError({ error }: { error: Error }) {
  return (
    <main className="mx-auto max-w-md p-4">
      <ErrorNotice
        error={error}
        title="화면을 불러오지 못했습니다."
        body="잠시 후 다시 시도해 주세요."
        actionLabel="다시 시도"
        onAction={reloadPage}
      />
    </main>
  );
}
