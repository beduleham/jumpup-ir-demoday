"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BUTTON_PRIMARY, INPUT, PANEL } from "@/components/admin/styles";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || password === "") return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.refresh();
        return;
      }
      setError(
        response.status === 401
          ? "비밀번호가 일치하지 않습니다."
          : "로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } catch (cause) {
      console.error("[admin] 로그인 요청 실패", cause);
      setError("서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.");
    }
    setPending(false);
  }

  return (
    <main className="mx-auto max-w-sm py-12">
      <form onSubmit={submit} className={`${PANEL} flex flex-col gap-3`}>
        <h2 className="text-h2 text-text">관리자 로그인</h2>
        <label htmlFor="admin-password" className="text-text">
          관리자 비밀번호
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? "admin-login-error" : undefined}
          className={INPUT}
        />
        {error ? (
          <p id="admin-login-error" role="alert" className="rounded-md bg-danger-surface p-3 text-danger">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
          {pending ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
