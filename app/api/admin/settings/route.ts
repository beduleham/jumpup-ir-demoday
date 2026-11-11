import type { NextRequest } from "next/server";
import { rejectUnlessAdmin } from "@/lib/admin-auth";
import { updateSettings } from "@/lib/admin-data";
import { adminError, adminFail, adminOk, readJson } from "@/lib/admin-http";
import { broadcastStateChange } from "@/lib/realtime-broadcast";
import { updateSettingsRequestSchema } from "@/types/admin";

export const dynamic = "force-dynamic";

// 대회 단계, 발표 기업, 시상 단계를 바꾸고 모든 화면에 변경을 알린다.
export async function POST(request: NextRequest) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const parsed = updateSettingsRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return adminFail(400, "요청 형식이 올바르지 않습니다.");

  try {
    const settings = await updateSettings(parsed.data);
    // 알림 전송이 실패해도 변경은 저장되어 있다. 화면들은 주기적 확인으로 따라오므로 성공으로 응답하되 사실을 알린다.
    const delivered = await broadcastStateChange(settings);
    return adminOk({
      data: {
        status: settings.status,
        current_pitch_team_id: settings.current_pitch_team_id,
        reveal_step: settings.reveal_step,
        show_live_totals: settings.show_live_totals,
        updated_at: settings.updated_at,
      },
      realtime: delivered ? "sent" : "failed",
    });
  } catch (error) {
    return adminError("api/admin/settings", error);
  }
}
