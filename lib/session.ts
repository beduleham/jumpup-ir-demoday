import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSessionSecret } from "@/lib/env";
import { sessionInvestorSchema, type SessionInvestor } from "@/types/competition";

// 참가자 세션 쿠키 형식: base64url(JSON 페이로드) + "." + base64url(HMAC-SHA256 서명).
// 발급(로그인)은 후속 작업이 createSessionToken으로 처리하고, 홈 화면은 검증만 한다.
export const SESSION_COOKIE = "jumpup_session";

const sessionPayloadSchema = sessionInvestorSchema.extend({
  exp: z.number().int(), // 만료 시각(유닉스 초)
});

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function createSessionToken(
  investor: SessionInvestor,
  secret: string,
  expiresAt: Date,
): string {
  const payload = { ...investor, exp: Math.floor(expiresAt.getTime() / 1000) };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

/** 서명이 맞고 만료되지 않은 토큰이면 참가자 정보를, 아니면 null을 돌려준다. */
export function verifySessionToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): SessionInvestor | null {
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

  const { exp, ...investor } = parsed.data;
  if (exp * 1000 <= now.getTime()) return null;
  return investor;
}

/** 요청 쿠키에서 참가자 세션을 읽는다. 쿠키가 없거나 무효면 미인증(null)이다. */
export function readSessionInvestor(): SessionInvestor | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token, getSessionSecret());
}
