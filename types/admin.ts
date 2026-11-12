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
    /** 투자가 열린 뒤 이전 단계로 되돌릴 때, 관리자가 확인 창에서 확인했음을 뜻한다. */
    confirm_revert: z.boolean().optional(),
  })
  .strict()
  .refine(
    (patch) => Object.keys(patch).some((key) => key !== "confirm_revert"),
    "변경할 항목이 없습니다.",
  );
export type UpdateSettingsRequest = z.infer<typeof updateSettingsRequestSchema>;

export const RESET_CONFIRMATION = "초기화 실행";
/** 명단(기업·투자자)까지 모두 지우는 전체 초기화의 확인 문구 */
export const ROSTER_RESET_CONFIRMATION = "명단 삭제 실행";

// 대형 스크린(/result)의 시상 연출 단계. 화면 동작은 lib/reveal.ts가 같은 번호로 정의한다.
export const REVEAL_STEP_LABELS = [
  "시상식 대기",
  "4위 이하 공개",
  "3위 발표",
  "2위 발표",
  "1위 발표 예고",
  "1위 발표",
  "최종 포디엄",
] as const;
