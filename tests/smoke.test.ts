import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { parseServerEnv } from "@/lib/env";
import { healthCheckResponseSchema } from "@/lib/health";

describe("GET /api/health", () => {
  it("200과 스키마에 맞는 본문을 돌려준다", async () => {
    const response = GET();
    expect(response.status).toBe(200);

    const body = healthCheckResponseSchema.parse(await response.json());
    expect(body.status).toBe("ok");
    expect(body.env).toBe("test");
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
