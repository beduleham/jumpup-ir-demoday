"use client";

import { UserCheck } from "lucide-react";
import { useState } from "react";

// 미인증 방문자용 안내. 실제 본인 확인 입력·검증은 로그인 작업에서 이 버튼에 연결한다.
export function AuthPrompt() {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <section
      aria-labelledby="auth-prompt-title"
      className="rounded-xl border border-border bg-surface p-4"
    >
      <h2 id="auth-prompt-title" className="text-h3 font-semibold text-text">
        참가자 본인 확인 필요
      </h2>
      <p className="mt-1 text-text-muted">
        모의 IR 모바일 투자에 참여하시려면 본인 확인을 진행해 주세요.
      </p>
      <button
        type="button"
        aria-expanded={guideOpen}
        aria-controls="auth-guide"
        onClick={() => setGuideOpen(true)}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-h3 text-primary-foreground hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <UserCheck aria-hidden="true" size={20} strokeWidth={2} />
        참가자 인증하기
      </button>
      <p id="auth-guide" role="status" className="mt-3 text-text-muted" hidden={!guideOpen}>
        운영진에게 받은 개별 초대 링크로 접속하면 본인 확인이 완료됩니다. 링크를 받지 못했다면
        현장 운영진에게 문의해 주세요.
      </p>
    </section>
  );
}
