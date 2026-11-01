import { z } from "zod";
export const MAX_LOGS_LIMIT = 500;
export const logsParamsSchema = z.object({
  videoId: z.string().uuid(),
});
export const logsQuerySchema = z.object({
  jobId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LOGS_LIMIT).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  order: z.enum(["asc", "desc"]).default("asc"),
});
export type LogsParams = z.infer<typeof logsParamsSchema>;
export type LogsQuery = z.infer<typeof logsQuerySchema>;
