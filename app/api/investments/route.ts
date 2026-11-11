import { NextResponse, type NextRequest } from "next/server";
import { InvestmentRejected, setInvestment } from "@/lib/investments";
import { SESSION_COOKIE, sessionFromCookieValue } from "@/lib/session";
import { setInvestmentRequestSchema } from "@/types/investment";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function failure(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status, headers: NO_STORE });
}

// 로그인한 참가자가 한 기업에 배분한 금액을 target_units(억 원)로 맞춘다.
// 누구의 투자인지는 세션 쿠키로만 정한다. 한도·자기 기업·단계 규칙은 DB(set_investment)가 강제한다.
export async function POST(request: NextRequest) {
  const session = sessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return failure(401, "세션이 만료되었습니다. 다시 로그인해주세요.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure(400, "요청 형식이 올바르지 않습니다.");
  }
  const parsed = setInvestmentRequestSchema.safeParse(body);
  if (!parsed.success) return failure(400, "요청 형식이 올바르지 않습니다.");

  try {
    const data = await setInvestment(session.investor_id, parsed.data.team_id, parsed.data.target_units);
    return NextResponse.json({ success: true, data }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof InvestmentRejected) return failure(error.status, error.message);
    console.error("[api/investments] 투자 저장 실패", error);
    return failure(500, "일시적인 오류로 투자를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
