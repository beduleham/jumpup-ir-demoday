import { NextResponse } from "next/server";
import { fetchPublicResults } from "@/lib/public-results";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate" };

// 로그인 없이 누구나 읽는 엔드포인트(대형 스크린용). 순위·유치액·투자자 수는
// 결과 공개 상태가 된 뒤에만 실제 값이 나간다. 그 전의 마스킹은 서버가 강제한다.
export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await fetchPublicResults() }, { headers: NO_STORE });
  } catch (error) {
    console.error("[api/public/results] 결과 조회 실패", error);
    return NextResponse.json(
      { success: false, error: { message: "결과 정보를 불러올 수 없습니다." } },
      { status: 503, headers: NO_STORE },
    );
  }
}
