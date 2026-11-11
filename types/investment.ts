import { z } from "zod";

/** 투자 금액의 단위는 모두 1억 원이다. */

export const setInvestmentRequestSchema = z.object({
  team_id: z.string().uuid(),
  target_units: z.number().int().min(0).max(10),
});
export type SetInvestmentRequest = z.infer<typeof setInvestmentRequestSchema>;

export const setInvestmentDataSchema = z.object({
  investor_id: z.string(),
  team_id: z.string(),
  allocated_units: z.number().int(),
  total_invested_units: z.number().int(),
  remaining_units: z.number().int(),
});
export type SetInvestmentData = z.infer<typeof setInvestmentDataSchema>;

export const myInvestmentsDataSchema = z.object({
  investor_id: z.string(),
  total_invested_units: z.number().int(),
  remaining_units: z.number().int(),
  allocations: z.array(z.object({ team_id: z.string(), amount_units: z.number().int() })),
});
export type MyInvestmentsData = z.infer<typeof myInvestmentsDataSchema>;

const failureSchema = z.object({ success: z.literal(false), error: z.string() });

export const setInvestmentResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: setInvestmentDataSchema }),
  failureSchema,
]);

export const myInvestmentsResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: myInvestmentsDataSchema }),
  failureSchema,
]);
