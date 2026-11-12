import type { NextRequest } from "next/server";
import { z } from "zod";
import { rejectUnlessAdmin } from "@/lib/admin-auth";
import { fetchAdminSettings, resetRoster } from "@/lib/admin-data";
import { adminError, adminFail, adminOk, readJson } from "@/lib/admin-http";
import { broadcastStateChange } from "@/lib/realtime-broadcast";
import { ROSTER_RESET_CONFIRMATION } from "@/types/admin";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ confirmation: z.literal(ROSTER_RESET_CONFIRMATION) });

// 명단(기업·투자자)과 투자 기록을 모두 지우는 되돌릴 수 없는 작업. 확인 문구를 정확히 보낸 요청만 실행한다.
export async function POST(request: NextRequest) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const parsed = requestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return adminFail(
      400,
      `확인 문구가 일치하지 않습니다. '${ROSTER_RESET_CONFIRMATION}'을 정확히 입력해주세요.`,
    );
  }

  try {
    await resetRoster();
    const delivered = await broadcastStateChange(await fetchAdminSettings(), true);
    return adminOk({
      message: "명단과 투자 데이터가 모두 초기화되었습니다.",
      realtime: delivered ? "sent" : "failed",
    });
  } catch (error) {
    return adminError("api/admin/reset-roster", error);
  }
}
