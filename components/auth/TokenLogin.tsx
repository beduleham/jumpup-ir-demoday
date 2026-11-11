"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";

const INVALID_LINK = "유효하지 않거나 만료된 초대 링크입니다. 등록된 휴대폰 번호로 인증해주세요.";
const TEMPORARY_FAILURE =
  "초대 링크를 확인하지 못했습니다. 등록된 휴대폰 번호로 인증하거나 링크를 다시 열어 주세요.";

/**
 * 초대 링크(/?token=...)로 들어온 참가자의 세션을 연다.
 * 메신저의 링크 미리보기가 일회성 토큰을 써 버리지 않도록, 페이지를 연 브라우저에서만 소비한다.
 */
export function TokenLogin({ token }: { token: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    // 개발 모드의 이중 실행으로 토큰이 두 번 제출되지 않게 한다.
    if (started.current) return;
    started.current = true;

    async function signIn() {
      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "token", token }),
        });
        if (response.ok) {
          // 주소에서 토큰을 지우고 투자 화면으로 바꾼다.
          router.replace("/");
          router.refresh();
          return;
        }
        setFailure(response.status === 400 ? INVALID_LINK : TEMPORARY_FAILURE);
      } catch (cause) {
        console.error("[login] 초대 링크 확인 요청 실패", cause);
        setFailure(TEMPORARY_FAILURE);
      }
    }
    void signIn();
  }, [router, token]);

  if (failure) return <PhoneLoginForm notice={failure} />;

  return (
    <section role="status" className="rounded-xl border border-border bg-surface p-4 text-center">
      <span
        aria-hidden="true"
        className="mx-auto block h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary motion-reduce:animate-none"
      />
      <p className="mt-3 text-text">참가자 정보를 확인하는 중입니다...</p>
    </section>
  );
}
