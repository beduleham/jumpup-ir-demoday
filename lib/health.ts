import { z } from "zod";

export const healthCheckResponseSchema = z.object({
  /** ok: 앱과 DB 모두 정상 / degraded: 앱은 살아 있지만 DB에 닿지 못함 */
  status: z.enum(["ok", "degraded"]),
  db: z.enum(["connected", "disconnected"]),
  timestamp: z.string().datetime(),
  env: z.enum(["development", "production", "test"]),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
