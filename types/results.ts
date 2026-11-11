import { z } from "zod";
import { competitionStatusSchema } from "@/types/competition";

/** 금액 단위는 1억 원. 결과 공개 전에는 집계 필드가 모두 0이고 순서는 기업 번호순이다. */
export const teamResultItemSchema = z.object({
  team_id: z.string(),
  team_no: z.number().int(),
  company_name: z.string(),
  leader_name: z.string(),
  description: z.string(),
  total_raised_units: z.number().int(),
  investor_count: z.number().int(),
  external_raised_units: z.number().int(),
  final_rank: z.number().int(),
  is_override: z.boolean(),
});
export type TeamResultItem = z.infer<typeof teamResultItemSchema>;

export const publicResultsSchema = z.object({
  status: competitionStatusSchema,
  reveal_step: z.number().int(),
  show_live_totals: z.boolean(),
  results: z.array(teamResultItemSchema),
  updated_at: z.string(),
});
export type PublicResults = z.infer<typeof publicResultsSchema>;
