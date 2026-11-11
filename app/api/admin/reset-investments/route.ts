import type { NextRequest } from "next/server";
import { z } from "zod";
import { rejectUnlessAdmin } from "@/lib/admin-auth";
import { resetInvestments } from "@/lib/admin-data";
import { adminError, adminFail, adminOk, readJson } from "@/lib/admin-http";
import { RESET_CONFIRMATION } from "@/types/admin";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ confirmation: z.literal(RESET_CONFIRMATION) });

// 모든 투자 기록을 지우는 되돌릴 수 없는 작업. 확인 문구를 정확히 보낸 요청만 실행한다.
export async function POST(request: NextRequest) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const parsed = requestSchema.safeParse(await readJson(request));
  if (!parsed.success) return adminFail(400, `확인 문구 "${RESET_CONFIRMATION}"를 정확히 입력해 주세요.`);

  try {
    await resetInvestments();
    return adminOk({ message: "투자 데이터가 초기화되었습니다." });
  } catch (error) {
    return adminError("api/admin/reset-investments", error);
  }
}
