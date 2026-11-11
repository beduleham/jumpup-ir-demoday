"use client";

import "./globals.css";
import { ErrorNotice, reloadPage } from "@/components/shell/ErrorNotice";

// 최상위 레이아웃 자체가 실패했을 때의 마지막 안전망. 레이아웃을 대신하므로 html·body를 직접 그린다.
export default function GlobalError({ error }: { error: Error }) {
  return (
    <html lang="ko">
      <body>
        <main className="mx-auto max-w-md p-4">
          <ErrorNotice
            error={error}
            title="화면을 불러오지 못했습니다."
            body="일시적인 오류가 발생했습니다. 다시 시도해도 계속되면 운영본부에 문의해주세요."
            actionLabel="다시 시도"
            onAction={reloadPage}
          />
        </main>
      </body>
    </html>
  );
}
