"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { normalizePhone } from "@/lib/phone";

const NETWORK_ERROR = "네트워크 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

/** 사전 등록된 휴대폰 번호로 본인 확인을 하고 세션을 연다. */
export function PhoneLoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!normalizePhone(phone)) {
      setError("휴대폰 번호 10~11자리를 입력해 주세요.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "phone", phone }),
      });
      const body: unknown = await response.json();
      if (response.ok) {
        // 세션 쿠키가 설정되었으므로 서버가 투자 화면을 새로 그리게 한다.
        router.replace("/");
        router.refresh();
        return;
      }
      setError(errorMessage(body) ?? NETWORK_ERROR);
    } catch (cause) {
      console.error("[login] 본인 확인 요청 실패", cause);
      setError(NETWORK_ERROR);
    }
    setPending(false);
  }

  return (
    <section aria-labelledby="login-title" className="rounded-xl border border-border bg-surface p-4">
      <h2 id="login-title" className="text-h3 font-semibold text-text">
        참가자 본인 확인 필요
      </h2>
      {notice ? (
        <p role="alert" className="mt-2 rounded-md bg-warning-surface p-3 text-warning">
          {notice}
        </p>
      ) : null}
      <form onSubmit={submit} noValidate className="mt-3 flex flex-col gap-3">
        <div>
          <label htmlFor="login-phone" className="text-text">
            사전 등록된 휴대폰 번호를 입력해주세요
          </label>
          <input
            id="login-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="010-0000-0000"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error ? "login-error" : undefined}
            className="mt-2 block min-h-12 w-full rounded-md border border-text-muted bg-surface px-3 text-h3 text-text placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
        {error ? (
          <p id="login-error" role="alert" className="rounded-md bg-danger-surface p-3 text-danger">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-h3 text-primary-foreground hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          <LogIn aria-hidden="true" size={20} strokeWidth={2} />
          {pending ? "확인하는 중…" : "입장하기"}
        </button>
      </form>
    </section>
  );
}

function errorMessage(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return null;
}
