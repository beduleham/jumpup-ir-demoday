import { z } from "zod";

export const competitionStatusSchema = z.enum(["ready", "pitching", "open", "closed", "revealed"]);
export type CompetitionStatus = z.infer<typeof competitionStatusSchema>;

// 공개 가능한 기업 메타데이터. 순위·유치액 같은 집계 필드는 여기에 두지 않는다.
export const publicTeamSchema = z.object({
  id: z.string(),
  team_no: z.number().int(),
  company_name: z.string(),
  leader_name: z.string(),
  description: z
    .string()
    .nullable()
    .transform((value) => value ?? ""),
});
export type PublicTeam = z.infer<typeof publicTeamSchema>;

export const publicStateSchema = z.object({
  status: competitionStatusSchema,
  reveal_step: z.number().int(),
  budget_units: z.number().int(),
  current_pitch_team: publicTeamSchema.nullable(),
  updated_at: z.string(),
});
export type PublicState = z.infer<typeof publicStateSchema>;

export const publicStateResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: publicStateSchema }),
  z.object({ success: z.literal(false), error: z.object({ message: z.string() }) }),
]);
export type PublicStateResponse = z.infer<typeof publicStateResponseSchema>;

export const sessionInvestorSchema = z.object({
  investor_id: z.string(),
  investor_no: z.number().int(),
  investor_name: z.string(),
  investor_type: z.enum(["founder", "external"]),
  team_id: z.string().nullable(),
  company_name: z.string().nullable(),
});
export type SessionInvestor = z.infer<typeof sessionInvestorSchema>;

export const STATUS_LABELS: Record<CompetitionStatus, string> = {
  ready: "준비",
  pitching: "발표 중",
  open: "투자 오픈",
  closed: "투자 마감",
  revealed: "결과 공개",
};

/** 화면을 다시 그려야 하는지 비교하는 데 쓰는 상태 요약 값. */
export function stateSnapshot(state: PublicState): string {
  return [
    state.status,
    state.reveal_step,
    state.budget_units,
    state.current_pitch_team?.id ?? "",
    state.updated_at,
  ].join("|");
}
