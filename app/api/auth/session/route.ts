import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { consumeInvitationToken, findInvestorByPhone } from "@/lib/investors";
import { normalizePhone } from "@/lib/phone";
import { sessionCookie } from "@/lib/session";
import type { SessionInvestor } from "@/types/competition";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

const requestSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("token"), token: z.string().min(1).max(256) }),
  z.object({ method: z.literal("phone"), phone: z.string().min(1).max(40) }),
]);

function failure(status: number, error: string, code?: string) {
  return NextResponse.json({ success: false, error, ...(code ? { code } : {}) }, { status, headers: NO_STORE });
}

function signedIn(investor: SessionInvestor) {
  const response = NextResponse.json({ success: true, data: investor }, { headers: NO_STORE });
  response.cookies.set(sessionCookie(investor));
  return response;
}

// 로그인 전 누구나 호출하는 공개 엔드포인트. 사전 등록된 참가자만 세션을 받는다.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure(400, "요청 형식이 올바르지 않습니다.");
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return failure(400, "요청 형식이 올바르지 않습니다.");

  try {
    if (parsed.data.method === "token") {
      const result = await consumeInvitationToken(parsed.data.token);
      if (!result.success) return failure(400, result.message, result.code);
      return signedIn(result.data);
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!phone) return failure(400, "휴대폰 번호 10~11자리를 입력해 주세요.");

    const investor = await findInvestorByPhone(phone);
    if (!investor) return failure(404, "등록되지 않은 연락처입니다. 운영본부에 문의해주세요.");
    return signedIn(investor);
  } catch (error) {
    // 입력값(전화번호·토큰)은 로그에 남기지 않는다.
    console.error("[api/auth/session] 본인 확인 처리 실패", error);
    return failure(500, "일시적인 오류로 본인 확인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
