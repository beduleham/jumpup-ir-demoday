import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env";
import { healthCheckResponseSchema } from "@/lib/health";

describe("헬스체크 응답 형식", () => {
  it("정상과 저하 상태를 모두 표현하고, 계약 밖의 값은 거부한다", () => {
    const base = { timestamp: "2026-11-11T00:00:00.000Z", env: "production" };
    expect(healthCheckResponseSchema.safeParse({ ...base, status: "ok", db: "connected" }).success).toBe(true);
    expect(healthCheckResponseSchema.safeParse({ ...base, status: "degraded", db: "disconnected" }).success).toBe(true);
    expect(healthCheckResponseSchema.safeParse({ ...base, status: "error", db: "connected" }).success).toBe(false);
  });
});

describe("parseServerEnv", () => {
  const valid = {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-placeholder",
    SUPABASE_SERVICE_ROLE_KEY: "service-placeholder",
    ADMIN_PASSWORD: "password-placeholder",
  };

  it("필수 값이 모두 있으면 통과하고 타임존 기본값은 Asia/Seoul이다", () => {
    expect(parseServerEnv(valid).NEXT_PUBLIC_APP_TIMEZONE).toBe("Asia/Seoul");
  });

  it("누락된 변수는 이름만 알리고 다른 값은 노출하지 않는다", () => {
    const { ADMIN_PASSWORD: _omitted, ...missing } = valid;
    expect(() => parseServerEnv(missing)).toThrowError(/ADMIN_PASSWORD/);
    expect(() => parseServerEnv(missing)).not.toThrowError(/service-placeholder/);
  });

  it(".env.example처럼 값이 비어 있으면 거부한다", () => {
    expect(() => parseServerEnv({ ...valid, SUPABASE_SERVICE_ROLE_KEY: "" })).toThrowError(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });
});
