import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";
import type { SessionInvestor } from "@/types/competition";

const SECRET = "test-only-session-secret-0123456789abcdef";
const NOW = new Date("2026-11-11T09:00:00Z");
const LATER = new Date("2026-11-11T21:00:00Z");

const founder: SessionInvestor = {
  investor_id: "investor-1",
  investor_no: 1,
  investor_name: "홍길동",
  investor_type: "founder",
  team_id: "team-1",
  company_name: "큐네스티",
};

describe("참가자 세션 토큰", () => {
  it("발급한 토큰을 검증하면 같은 참가자 정보가 나온다", () => {
    const token = createSessionToken(founder, SECRET, LATER);
    expect(verifySessionToken(token, SECRET, NOW)).toEqual(founder);
  });

  it("만료된 토큰은 거부한다", () => {
    const token = createSessionToken(founder, SECRET, NOW);
    expect(verifySessionToken(token, SECRET, LATER)).toBeNull();
  });

  it("다른 키로 서명된 토큰은 거부한다", () => {
    const token = createSessionToken(founder, "another-secret-0123456789abcdef-xyz", LATER);
    expect(verifySessionToken(token, SECRET, NOW)).toBeNull();
  });

  it("본문을 바꿔 다른 참가자로 위장한 토큰은 거부한다", () => {
    const [, signature] = createSessionToken(founder, SECRET, LATER).split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...founder, investor_no: 2, exp: Math.floor(LATER.getTime() / 1000) }),
    ).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it("형식이 잘못된 값은 거부한다", () => {
    expect(verifySessionToken("", SECRET, NOW)).toBeNull();
    expect(verifySessionToken("not-a-token", SECRET, NOW)).toBeNull();
    expect(verifySessionToken("a.b.c", SECRET, NOW)).toBeNull();
  });
});
