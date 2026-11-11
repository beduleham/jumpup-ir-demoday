import { NextResponse } from "next/server";
import { type HealthCheckResponse } from "@/lib/health";
import { createPublicClient } from "@/lib/supabase/server";

// 요청할 때마다 실제 상태를 확인해야 하므로 정적으로 굳히지 않는다.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };
// DB가 느리면 모니터링이 오래 기다리지 않도록 끊고 "닿지 못함"으로 알린다.
const DB_TIMEOUT_MS = 3000;

/** 공개(anon) 권한으로 settings 한 행을 읽어 DB에 닿는지 확인한다. 가장 가벼운 조회다. */
async function isDatabaseReachable(): Promise<boolean> {
  try {
    const result = await createPublicClient()
      .from("settings")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
    if (result.error) {
      console.error("[health] DB 확인 실패", result.error.message);
      return false;
    }
    return true;
  } catch (error) {
    // 접속 정보 누락, 네트워크 오류 등. 원인은 서버 로그에만 남긴다.
    console.error("[health] DB 확인 실패", error instanceof Error ? error.message : error);
    return false;
  }
}

// 로그인 없이 누구나 호출하는 상태 확인. 내부 오류 내용이나 접속 정보는 응답에 싣지 않는다.
export async function GET() {
  const connected = await isDatabaseReachable();
  const body: HealthCheckResponse = {
    status: connected ? "ok" : "degraded",
    db: connected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  };
  return NextResponse.json(body, { status: connected ? 200 : 503, headers: NO_STORE });
}
