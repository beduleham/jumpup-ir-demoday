import "server-only";
import { z } from "zod";

// 서버 전용 환경 변수의 유일한 진입점. 특권 키는 이 모듈을 통해서만 읽는다.
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  NEXT_PUBLIC_APP_TIMEZONE: z.string().min(1).default("Asia/Seoul"),
});

const publicSupabaseEnvSchema = serverEnvSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
});

// 참가자 세션 쿠키 서명 키. 추측할 수 없도록 32자 이상을 요구한다.
const sessionSecretSchema = z.object({ SESSION_SECRET: z.string().min(32) });

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicSupabaseEnv = z.infer<typeof publicSupabaseEnvSchema>;

type EnvSource = Record<string, string | undefined>;

function parseEnv<T>(schema: z.ZodType<T>, source: EnvSource): T {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    // 값은 노출하지 않고 문제가 된 변수 이름만 알린다.
    const names = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(
      `환경 변수가 없거나 형식이 잘못되었습니다: ${names.join(", ")}. .env.example을 참고해 설정하세요.`,
    );
  }
  return parsed.data;
}

export function parseServerEnv(source: EnvSource): ServerEnv {
  return parseEnv(serverEnvSchema, source);
}

// 빌드가 비밀값 없이도 통과하도록, 모듈 로드 시점이 아니라 호출 시점에 검증한다.
export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}

/** 공개 읽기(anon) 전용 Supabase 접속 정보. 특권 키가 필요 없는 조회에 쓴다. */
export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  return parseEnv(publicSupabaseEnvSchema, process.env);
}

export function getSessionSecret(): string {
  return parseEnv(sessionSecretSchema, process.env).SESSION_SECRET;
}
