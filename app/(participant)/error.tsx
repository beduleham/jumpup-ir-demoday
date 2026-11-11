"use client";

import { ErrorNotice, reloadPage } from "@/components/shell/ErrorNotice";

export default function ParticipantError({ error }: { error: Error }) {
  return (
    <main className="p-4">
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
