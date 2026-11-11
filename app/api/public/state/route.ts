import { NextResponse } from "next/server";
import { fetchPublicState } from "@/lib/competition-state";
import { publicStateSchema, type PublicStateResponse } from "@/types/competition";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

// 로그인 없이 누구나 읽는 공개 엔드포인트. 순위·유치액·투자자 수는 어떤 상태에서도 내보내지 않는다.
export async function GET() {
  try {
    // 스키마로 다시 걸러, 조회 계층이 바뀌어도 정의된 필드만 응답에 남긴다.
    const data = publicStateSchema.parse(await fetchPublicState());
    return NextResponse.json<PublicStateResponse>({ success: true, data }, { headers: NO_STORE });
  } catch (error) {
    console.error("[api/public/state] 대회 상태 조회 실패", error);
    return NextResponse.json<PublicStateResponse>(
      { success: false, error: { message: "대회 상태 정보를 불러올 수 없습니다." } },
      { status: 503, headers: NO_STORE },
    );
  }
}
