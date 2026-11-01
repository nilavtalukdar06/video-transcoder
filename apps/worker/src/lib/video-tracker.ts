import { and, desc, eq } from "drizzle-orm";
import { Database } from "../db";
import { transcodingJobs, videos } from "../db/schema";
import { Logger } from "./logger";
const MAX_ERROR_LENGTH = 2000;
export interface StartedJob {
  videoId: string;
  jobId: string;
}
export abstract class VideoTracker {
  static async start(
    sourceKey: string,
    size?: number,
  ): Promise<StartedJob | null> {
    await Database.db
      .update(videos)
      .set({
        status: "uploaded",
        ...(size === undefined ? {} : { sizeBytes: size }),
      })
      .where(
        and(eq(videos.sourceKey, sourceKey), eq(videos.status, "uploading")),
      );
    return Database.db.transaction(async (tx) => {
      const [video] = await tx
        .select()
        .from(videos)
        .where(eq(videos.sourceKey, sourceKey))
        .for("update");
      if (!video) {
        Logger.warn({ sourceKey }, "No tracked video for uploaded object");
        return null;
      }
      const [latest] = await tx
        .select()
        .from(transcodingJobs)
        .where(eq(transcodingJobs.videoId, video.id))
        .orderBy(desc(transcodingJobs.attempt))
        .limit(1);
      if (video.status === "processing" || video.status === "completed") {
        Logger.info(
          { videoId: video.id, status: video.status },
          "Video already handled, skipping",
        );
        return null;
      }
      if (video.status === "queued" && latest) {
        if (latest.ecsTaskArn) {
          Logger.info(
            { videoId: video.id, jobId: latest.id },
            "Transcoder task already started, skipping",
          );
          return null;
        }
        await tx
          .update(transcodingJobs)
          .set({
            status: "failed",
            errorMessage: "Transcoder task was never started",
            finishedAt: new Date(),
          })
          .where(eq(transcodingJobs.id, latest.id));
      }
      const [job] = await tx
        .insert(transcodingJobs)
        .values({
          videoId: video.id,
          status: "pending",
          attempt: (latest?.attempt ?? 0) + 1,
        })
        .returning();
      await tx
        .update(videos)
        .set({
          status: "queued",
          sizeBytes: size ?? video.sizeBytes,
          errorMessage: null,
          completedAt: null,
        })
        .where(eq(videos.id, video.id));
      return { videoId: video.id, jobId: job!.id };
    });
  }
  static async setTaskArn(jobId: string, taskArn: string): Promise<void> {
    try {
      await Database.db
        .update(transcodingJobs)
        .set({ ecsTaskArn: taskArn })
        .where(eq(transcodingJobs.id, jobId));
    } catch (err) {
      Logger.error({ err, jobId, taskArn }, "Could not record ECS task ARN");
    }
  }
  static async fail(startedJob: StartedJob, err: unknown): Promise<void> {
    const errorMessage = this.errorMessage(err);
    try {
      await Database.db.transaction(async (tx) => {
        await tx
          .update(transcodingJobs)
          .set({ status: "failed", errorMessage, finishedAt: new Date() })
          .where(eq(transcodingJobs.id, startedJob.jobId));
        await tx
          .update(videos)
          .set({ status: "failed", errorMessage })
          .where(eq(videos.id, startedJob.videoId));
      });
    } catch (dbErr) {
      Logger.error(
        { err: dbErr, ...startedJob },
        "Could not mark video as failed",
      );
    }
  }
  private static errorMessage(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err);
    return message.slice(0, MAX_ERROR_LENGTH);
  }
}
