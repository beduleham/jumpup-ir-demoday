import type { NextRequest } from "next/server";
import { rejectUnlessAdmin } from "@/lib/admin-auth";
import { updateSettings } from "@/lib/admin-data";
import { adminError, adminFail, adminOk, readJson } from "@/lib/admin-http";
import { updateSettingsRequestSchema } from "@/types/admin";

export const dynamic = "force-dynamic";

// 대회 단계, 발표 기업, 시상 단계를 바꾼다. 참가자 화면은 공개 상태 API를 통해 이 변경을 따라온다.
export async function POST(request: NextRequest) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const parsed = updateSettingsRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return adminFail(400, "요청 형식이 올바르지 않습니다.");

  try {
    const settings = await updateSettings(parsed.data);
    return adminOk({
      data: {
        status: settings.status,
        current_pitch_team_id: settings.current_pitch_team_id,
        reveal_step: settings.reveal_step,
        updated_at: settings.updated_at,
      },
    });
  } catch (error) {
    return adminError("api/admin/settings", error);
  }
}
