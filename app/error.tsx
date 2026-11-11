"use client";

import { ErrorNotice, reloadPage } from "@/components/shell/ErrorNotice";

// 영역별 오류 화면이 없는 경로에서 쓰이는 공통 오류 화면.
export default function AppError({ error }: { error: Error }) {
  return (
    <main className="mx-auto max-w-md p-4">
      <ErrorNotice
        error={error}
        title="화면을 불러오지 못했습니다."
        body="일시적인 오류가 발생했습니다. 다시 시도해도 계속되면 운영본부에 문의해주세요."
        actionLabel="다시 시도"
        onAction={reloadPage}
      />
    </main>
  );
}
