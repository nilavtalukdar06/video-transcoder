import { z } from "zod";

const logMessageSchema = z.object({
  videoId: z.string().nullable(),
  jobId: z.string().nullable(),
  log: z.string(),
  timestamp: z.string(),
});

export type LogMessage = z.infer<typeof logMessageSchema>;

export abstract class LogMessageParser {
  static parse(raw: string): LogMessage {
    return logMessageSchema.parse(JSON.parse(raw));
  }
}
