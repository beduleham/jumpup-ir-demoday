import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSessionSecret } from "@/lib/env";
import {
  sessionPayloadSchema,
  type SessionInvestor,
  type SessionPayload,
} from "@/types/competition";

// 참가자 세션 쿠키 형식: base64url(JSON 페이로드) + "." + base64url(HMAC-SHA256 서명).
export const SESSION_COOKIE = "jumpup_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function createSessionToken(
  investor: SessionInvestor,
  secret: string,
  now: Date = new Date(),
): string {
  const payload: SessionPayload = {
    investor_id: investor.investor_id,
    investor_no: investor.investor_no,
    investor_name: investor.investor_name,
    investor_type: investor.investor_type,
    team_id: investor.team_id,
    company_name: investor.company_name,
    created_at: Math.floor(now.getTime() / 1000),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

/** 서명이 맞고 발급 후 24시간이 지나지 않은 토큰이면 세션 정보를, 아니면 null을 돌려준다. */
export function verifySessionToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    // 서명은 맞지만 본문이 JSON이 아닌 토큰: 무효 세션으로 취급한다.
    return null;
  }

  const parsed = sessionPayloadSchema.safeParse(json);
  if (!parsed.success) return null;

  const ageSeconds = now.getTime() / 1000 - parsed.data.created_at;
  if (ageSeconds < 0 || ageSeconds >= SESSION_MAX_AGE_SECONDS) return null;
  return parsed.data;
}

/** 쿠키 값에서 세션을 읽는다. 값이 없거나 무효면 미인증(null)이다. */
export function sessionFromCookieValue(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  return verifySessionToken(value, getSessionSecret());
}

/** 서버 컴포넌트용: 현재 요청의 쿠키에서 세션을 읽는다. */
export function readSessionInvestor(): SessionPayload | null {
  return sessionFromCookieValue(cookies().get(SESSION_COOKIE)?.value);
}

function cookieAttributes() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

/** 로그인 응답에 실을 세션 쿠키. */
export function sessionCookie(investor: SessionInvestor) {
  return {
    name: SESSION_COOKIE,
    value: createSessionToken(investor, getSessionSecret()),
    ...cookieAttributes(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/** 로그아웃 응답에 실을, 즉시 만료되는 쿠키. */
export function expiredSessionCookie() {
  return { name: SESSION_COOKIE, value: "", ...cookieAttributes(), maxAge: 0 };
}
