import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";
import type { SessionInvestor } from "@/types/competition";

const SECRET = "test-only-session-secret-0123456789abcdef";
const ISSUED = new Date("2026-11-11T09:00:00Z");
const hoursLater = (hours: number) => new Date(ISSUED.getTime() + hours * 60 * 60 * 1000);

const founder: SessionInvestor = {
  investor_id: "investor-1",
  investor_no: 1,
  investor_name: "홍길동",
  investor_type: "founder",
  team_id: "team-1",
  company_name: "큐네스티",
};

describe("참가자 세션 토큰", () => {
  it("발급한 토큰을 검증하면 같은 참가자 정보와 발급 시각이 나온다", () => {
    const token = createSessionToken(founder, SECRET, ISSUED);
    expect(verifySessionToken(token, SECRET, hoursLater(1))).toEqual({
      ...founder,
      created_at: ISSUED.getTime() / 1000,
    });
  });

  it("발급 후 24시간이 지나면 거부한다", () => {
    const token = createSessionToken(founder, SECRET, ISSUED);
    expect(verifySessionToken(token, SECRET, hoursLater(23.9))).not.toBeNull();
    expect(verifySessionToken(token, SECRET, hoursLater(24))).toBeNull();
  });

  it("발급 시각이 미래인 토큰은 거부한다", () => {
    const token = createSessionToken(founder, SECRET, hoursLater(1));
    expect(verifySessionToken(token, SECRET, ISSUED)).toBeNull();
  });

  it("다른 키로 서명된 토큰은 거부한다", () => {
    const token = createSessionToken(founder, "another-secret-0123456789abcdef-xyz", ISSUED);
    expect(verifySessionToken(token, SECRET, ISSUED)).toBeNull();
  });

  it("본문을 바꿔 다른 참가자로 위장한 토큰은 거부한다", () => {
    const [, signature] = createSessionToken(founder, SECRET, ISSUED).split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...founder, investor_no: 2, created_at: ISSUED.getTime() / 1000 }),
    ).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`, SECRET, ISSUED)).toBeNull();
  });

  it("형식이 잘못된 값은 거부한다", () => {
    expect(verifySessionToken("", SECRET, ISSUED)).toBeNull();
    expect(verifySessionToken("not-a-token", SECRET, ISSUED)).toBeNull();
    expect(verifySessionToken("a.b.c", SECRET, ISSUED)).toBeNull();
  });
});
