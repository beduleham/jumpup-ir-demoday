import { NextResponse, type NextRequest } from "next/server";
import { fetchMyInvestments } from "@/lib/investments";
import { SESSION_COOKIE, sessionFromCookieValue } from "@/lib/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

// 로그인한 참가자 본인의 배분 내역만 돌려준다. 다른 참가자의 내역이나 집계는 포함하지 않는다.
export async function GET(request: NextRequest) {
  const session = sessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "세션이 만료되었습니다. 다시 로그인해주세요." },
      { status: 401, headers: NO_STORE },
    );
  }

  try {
    const data = await fetchMyInvestments(session.investor_id);
    return NextResponse.json({ success: true, data }, { headers: NO_STORE });
  } catch (error) {
    console.error("[api/investments/mine] 투자 내역 조회 실패", error);
    return NextResponse.json(
      { success: false, error: "투자 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500, headers: NO_STORE },
    );
  }
}
