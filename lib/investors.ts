import "server-only";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { sessionInvestorSchema, type SessionInvestor } from "@/types/competition";

// 참가자 본인 확인. investors·invitation_tokens는 브라우저 역할이 읽을 수 없으므로
// 서버가 특권 클라이언트로 조회한다. 호출자는 입력을 검증한 로그인 라우트뿐이다.

/** 사전 등록된(정규화된) 전화번호로 참가자를 찾는다. 없으면 null. */
export async function findInvestorByPhone(phone: string): Promise<SessionInvestor | null> {
  const supabase = createServiceClient();

  const investor = await supabase
    .from("investors")
    .select("id, investor_no, investor_name, investor_type, team_id")
    .eq("phone", phone)
    .maybeSingle();
  if (investor.error) throw new Error(`투자자 조회 실패: ${investor.error.message}`);
  if (!investor.data) return null;

  let companyName: string | null = null;
  if (investor.data.team_id) {
    const team = await supabase
      .from("teams")
      .select("company_name")
      .eq("id", investor.data.team_id)
      .maybeSingle();
    if (team.error) throw new Error(`소속 기업 조회 실패: ${team.error.message}`);
    companyName = team.data?.company_name ?? null;
  }

  return sessionInvestorSchema.parse({
    investor_id: investor.data.id,
    investor_no: investor.data.investor_no,
    investor_name: investor.data.investor_name,
    investor_type: investor.data.investor_type,
    team_id: investor.data.team_id,
    company_name: companyName,
  });
}

const consumeResultSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: sessionInvestorSchema }),
  z.object({
    success: z.literal(false),
    code: z.enum(["INVALID_TOKEN", "ALREADY_USED", "EXPIRED_TOKEN"]),
    message: z.string(),
  }),
]);
export type ConsumeTokenResult = z.infer<typeof consumeResultSchema>;

/** 일회성 초대 토큰을 검증하고 사용 처리한다. */
export async function consumeInvitationToken(token: string): Promise<ConsumeTokenResult> {
  const supabase = createServiceClient();
  const result = await supabase.rpc("consume_invitation_token", { p_token: token });
  if (result.error) throw new Error(`초대 토큰 확인 실패: ${result.error.message}`);
  return consumeResultSchema.parse(result.data);
}
