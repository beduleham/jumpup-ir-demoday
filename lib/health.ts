import { z } from "zod";

export const healthCheckResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string().datetime(),
  env: z.enum(["development", "production", "test"]),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
