import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerEnv, getSessionSecret } from "@/lib/env";

// 관리자 세션 쿠키: base64url(JSON) + "." + base64url(HMAC-SHA256("admin:" + 본문)).
// 서명 입력에 "admin:"을 붙여, 같은 키로 서명된 참가자 세션이 관리자 세션으로 통하지 않게 한다.
export const ADMIN_COOKIE = "jumpup_admin_session";
export const ADMIN_MAX_AGE_SECONDS = 60 * 60 * 12;

const payloadSchema = z.object({
  role: z.literal("admin"),
  issued_at: z.number().int(),
  expires_at: z.number().int(),
});

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(`admin:${body}`).digest("base64url");
}

export function createAdminToken(secret: string, now: Date = new Date()): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload = { role: "admin", issued_at: issuedAt, expires_at: issuedAt + ADMIN_MAX_AGE_SECONDS };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifyAdminToken(token: string, secret: string, now: Date = new Date()): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, signature] = parts;

  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    // 서명은 맞지만 본문이 JSON이 아닌 토큰: 무효로 취급한다.
    return false;
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return false;

  const nowSeconds = now.getTime() / 1000;
  return parsed.data.issued_at <= nowSeconds && nowSeconds < parsed.data.expires_at;
}

/** 입력한 비밀번호가 ADMIN_PASSWORD와 같은지, 길이·내용이 드러나지 않게 비교한다. */
export function isAdminPassword(input: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(input), digest(getServerEnv().ADMIN_PASSWORD));
}

function isAdminCookieValue(value: string | undefined): boolean {
  return value !== undefined && verifyAdminToken(value, getSessionSecret());
}

/** 서버 컴포넌트용: 현재 요청이 관리자 세션을 갖고 있는지. */
export function hasAdminSession(): boolean {
  return isAdminCookieValue(cookies().get(ADMIN_COOKIE)?.value);
}

/**
 * 관리자 전용 라우트의 첫 줄에서 호출한다.
 * 관리자 세션이 없으면 돌려줄 401 응답을, 있으면 null을 반환한다.
 */
export function rejectUnlessAdmin(request: NextRequest): NextResponse | null {
  if (isAdminCookieValue(request.cookies.get(ADMIN_COOKIE)?.value)) return null;
  return NextResponse.json(
    { success: false, error: "관리자 로그인이 필요합니다." },
    { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

function cookieAttributes() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    // 관리자 API가 /api/admin 아래에 있어 Path를 /admin으로 좁히면 쿠키가 전송되지 않는다.
    path: "/",
  };
}

export function adminCookie() {
  return {
    name: ADMIN_COOKIE,
    value: createAdminToken(getSessionSecret()),
    ...cookieAttributes(),
    maxAge: ADMIN_MAX_AGE_SECONDS,
  };
}

export function expiredAdminCookie() {
  return { name: ADMIN_COOKIE, value: "", ...cookieAttributes(), maxAge: 0 };
}
