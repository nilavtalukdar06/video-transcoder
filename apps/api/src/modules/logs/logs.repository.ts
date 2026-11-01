import { and, eq } from "drizzle-orm";
import { ClickHouse } from "../../clickhouse";
import { Database } from "../../db";
import { videos } from "../../db/schema";
import type { LogsQuery } from "./logs.schema";
export interface LogEventRecord {
  eventId: string;
  videoId: string;
  jobId: string | null;
  log: string;
  metadata: string | null;
  timestamp: string;
}
interface LogEventRow {
  event_id: string;
  video_id: string;
  job_id: string;
  log: string;
  metadata: string | null;
  ts: number;
}
export abstract class LogsRepository {
  static async videoBelongsToUser(
    videoId: string,
    userId: string,
  ): Promise<boolean> {
    const rows = await Database.db
      .select({ id: videos.id })
      .from(videos)
      .where(and(eq(videos.id, videoId), eq(videos.userId, userId)))
      .limit(1);
    return rows.length > 0;
  }
  static async findByVideo(
    videoId: string,
    { jobId, limit, offset, order }: LogsQuery,
  ): Promise<LogEventRecord[]> {
    const direction = order === "desc" ? "DESC" : "ASC";
    const result = await ClickHouse.getClient().query({
      query: `
        SELECT event_id, video_id, job_id, log, metadata,
               toUnixTimestamp(timestamp) AS ts
        FROM log_events
        WHERE video_id = {videoId:String}
          ${jobId ? "AND job_id = {jobId:String}" : ""}
        ORDER BY timestamp ${direction},
                 JSONExtractString(metadata, 'producedAt') ${direction}
        LIMIT {limit:UInt32} OFFSET {offset:UInt32}
      `,
      query_params: { videoId, jobId, limit, offset },
      format: "JSONEachRow",
    });
    const rows = await result.json<LogEventRow>();
    return rows.map((row) => ({
      eventId: row.event_id,
      videoId: row.video_id,
      jobId: row.job_id || null,
      log: row.log,
      metadata: row.metadata,
      timestamp: new Date(row.ts * 1000).toISOString(),
    }));
  }
}
