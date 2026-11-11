import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv, getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

const OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false },
  // Next.js가 조회 결과를 데이터 캐시에 담아 두면 단계 전환·투자 내역이 화면에 반영되지 않는다.
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
  },
};

/** 공개 읽기(anon) 전용. RLS와 열 권한이 허용한 정보만 읽는다. */
export function createPublicClient() {
  const env = getPublicSupabaseEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, OPTIONS);
}

/**
 * RLS를 우회하는 특권 클라이언트. 호출 전에 반드시 요청자를 검증하고,
 * 그 요청자에게 허용된 자원에만 써야 한다.
 */
export function createServiceClient() {
  const env = getServerEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, OPTIONS);
}
