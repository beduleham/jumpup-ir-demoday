import "server-only";
import { STATE_CHANNEL, STATE_EVENT } from "@/lib/realtime-channel";
import { createServiceClient } from "@/lib/supabase/server";
import type { AdminSettings } from "@/types/admin";

/**
 * 대회 상태 변경을 모든 화면에 알린다. 전송에 실패해도 변경 자체는 이미 저장되어 있고
 * 화면들은 주기적 확인으로 따라오므로, 예외를 던지지 않고 성공 여부만 돌려준다.
 */
export async function broadcastStateChange(settings: AdminSettings, reset = false): Promise<boolean> {
  const supabase = createServiceClient();
  const channel = supabase.channel(STATE_CHANNEL);
  try {
    const result = await channel.httpSend(STATE_EVENT, {
      status: settings.status,
      current_pitch_team_id: settings.current_pitch_team_id,
      reveal_step: settings.reveal_step,
      show_live_totals: settings.show_live_totals,
      updated_at: settings.updated_at,
      ...(reset ? { reset: true } : {}),
    });
    if (!result.success) {
      console.error("[realtime] 상태 변경 알림 전송 실패", result.status, result.error);
    }
    return result.success;
  } catch (error) {
    console.error("[realtime] 상태 변경 알림 전송 실패", error);
    return false;
  } finally {
    await supabase.removeChannel(channel);
  }
}
