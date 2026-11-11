"use client";

import { ErrorNotice, reloadPage } from "@/components/shell/ErrorNotice";

export default function AdminError({ error }: { error: Error }) {
  return (
    <main>
      <ErrorNotice
        error={error}
        title="관리자 화면을 표시하는 중 오류가 발생했습니다."
        body="저장된 데이터에는 영향이 없습니다. 화면을 새로 불러와 주세요."
        actionLabel="새로고침"
        onAction={reloadPage}
      />
    </main>
  );
}
