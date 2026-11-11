import { z } from "zod";
import { competitionStatusSchema } from "@/types/competition";

/** 금액 단위는 모두 1억 원이다. */

export const adminTeamSchema = z.object({
  id: z.string(),
  team_no: z.number().int(),
  company_name: z.string(),
  leader_name: z.string(),
  phone: z.string(),
  description: z.string(),
  note: z.string(),
  total_raised_units: z.number().int(),
  investor_count: z.number().int(),
  external_raised_units: z.number().int(),
  calculated_rank: z.number().int(),
  final_rank: z.number().int(),
  manual_rank_override: z.number().int().nullable(),
});
export type AdminTeam = z.infer<typeof adminTeamSchema>;

export const adminInvestorSchema = z.object({
  id: z.string(),
  investor_no: z.number().int(),
  investor_name: z.string(),
  phone: z.string(),
  investor_type: z.enum(["founder", "external"]),
  team_id: z.string().nullable(),
  allocated_units: z.number().int(),
  remaining_units: z.number().int(),
  /** 가상 투자금을 모두 배분했는지 */
  is_submitted: z.boolean(),
});
export type AdminInvestor = z.infer<typeof adminInvestorSchema>;

export const adminSettingsSchema = z.object({
  status: competitionStatusSchema,
  current_pitch_team_id: z.string().nullable(),
  reveal_step: z.number().int(),
  budget_units: z.number().int(),
  show_live_totals: z.boolean(),
  updated_at: z.string(),
});
export type AdminSettings = z.infer<typeof adminSettingsSchema>;

export const adminDashboardSchema = z.object({
  settings: adminSettingsSchema,
  summary: z.object({
    total_investors: z.number().int(),
    participated_investors: z.number().int(),
    participation_rate: z.number(),
    total_invested_units: z.number().int(),
  }),
  teams: z.array(adminTeamSchema),
  investors: z.array(adminInvestorSchema),
});
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;

export const updateSettingsRequestSchema = z
  .object({
    status: competitionStatusSchema.optional(),
    current_pitch_team_id: z.string().uuid().nullable().optional(),
    reveal_step: z.number().int().min(0).max(6).optional(),
    show_live_totals: z.boolean().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, "변경할 항목이 없습니다.");
export type UpdateSettingsRequest = z.infer<typeof updateSettingsRequestSchema>;

export const RESET_CONFIRMATION = "초기화 실행";

export const REVEAL_STEP_LABELS = [
  "숨김",
  "3위 발표",
  "2위 발표",
  "1위 발표",
  "전체 순위표",
  "모바일 결과 오픈",
] as const;
