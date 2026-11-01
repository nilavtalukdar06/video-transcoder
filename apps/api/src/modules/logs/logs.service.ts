import { ApiError } from "../../lib/api-error";
import { Logger } from "../../lib/logger";
import { LogsRepository, type LogEventRecord } from "./logs.repository";
import type { LogsQuery } from "./logs.schema";
export interface LogEvent extends Omit<LogEventRecord, "metadata"> {
  metadata: Record<string, unknown> | null;
}
export interface LogsPage {
  videoId: string;
  logs: LogEvent[];
  limit: number;
  offset: number;
  hasMore: boolean;
}
function parseMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
export abstract class LogsService {
  static async getVideoLogs(
    userId: string,
    videoId: string,
    query: LogsQuery,
  ): Promise<LogsPage> {
    const owned = await LogsRepository.videoBelongsToUser(videoId, userId);
    if (!owned) {
      throw ApiError.notFound("Video not found");
    }
    let records: LogEventRecord[];
    try {
      records = await LogsRepository.findByVideo(videoId, {
        ...query,
        limit: query.limit + 1,
      });
    } catch (err) {
      Logger.error({ err, videoId }, "Could not query logs from ClickHouse");
      throw ApiError.internal("Could not fetch logs", err);
    }
    const hasMore = records.length > query.limit;
    return {
      videoId,
      logs: records.slice(0, query.limit).map((record) => ({
        ...record,
        metadata: parseMetadata(record.metadata),
      })),
      limit: query.limit,
      offset: query.offset,
      hasMore,
    };
  }
}
