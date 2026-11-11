"use client";

import { ErrorNotice, reloadPage } from "@/components/shell/ErrorNotice";

export default function ParticipantError({ error }: { error: Error }) {
  return (
    <main className="p-4">
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
