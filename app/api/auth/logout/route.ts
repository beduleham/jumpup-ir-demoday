import { NextResponse } from "next/server";
import { expiredSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

// 이 브라우저의 세션 쿠키만 지운다. 세션이 없어도 결과는 같다.
export function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(expiredSessionCookie());
  return response;
}
