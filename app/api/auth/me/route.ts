import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionFromCookieValue } from "@/lib/session";

export const dynamic = "force-dynamic";

// 쿠키가 있으면 본인 세션 정보를, 없거나 무효면 미인증을 돌려준다.
export function GET(request: NextRequest) {
  const investor = sessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json(
    { success: true, data: { authenticated: investor !== null, investor } },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
