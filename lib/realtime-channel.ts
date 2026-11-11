// 대회 상태가 바뀌었음을 모든 화면에 알리는 Supabase Realtime 브로드캐스트 채널.
// 공개 채널이라 누구나 메시지를 보낼 수 있으므로, 받는 쪽은 내용(payload)을 믿지 않고
// "서버 상태를 다시 확인하라"는 신호로만 쓴다.
export const STATE_CHANNEL = "jumpup_public_display";
export const STATE_EVENT = "state_change";
