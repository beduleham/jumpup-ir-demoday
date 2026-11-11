import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { AdminRequestError } from "@/lib/admin-data";

export const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export function adminOk(body: Record<string, unknown> = {}) {
  return NextResponse.json({ success: true, ...body }, { headers: NO_STORE });
}

export function adminFail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error, ...extra }, { status, headers: NO_STORE });
}

/** 본문을 JSON으로 읽는다. JSON이 아니면 undefined. */
export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** 처리 중 발생한 오류를 응답으로 바꾼다. 예상하지 못한 오류는 기록하고 내부 내용은 숨긴다. */
export function adminError(scope: string, error: unknown) {
  if (error instanceof AdminRequestError) return adminFail(error.status, error.message);
  console.error(`[${scope}] 처리 실패`, error);
  return adminFail(500, "일시적인 오류로 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
}
