import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 브라우저용 공개(anon) 클라이언트. 실시간 알림 구독에만 쓰고, 데이터는 서버 API로 읽는다.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** 공개 접속 정보가 빌드에 들어 있지 않으면 null(이 경우 화면은 주기적 확인만으로 동작한다). */
export function getBrowserClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  client ??= createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
