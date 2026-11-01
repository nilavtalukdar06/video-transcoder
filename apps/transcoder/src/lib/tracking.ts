import { and, eq } from "drizzle-orm";
import { Database } from "../db";
import { transcodingJobs, videoRenditions, videos } from "../db/schema";
import type { Rendition } from "./ffmpeg";
const MAX_ERROR_LENGTH = 2000;
export interface TrackedRun {
  videoId: string;
  jobId: string;
}
export abstract class Tracking {
  static async start({ videoId, jobId }: TrackedRun): Promise<void> {
    await Database.db.transaction(async (tx) => {
      await tx
        .update(transcodingJobs)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(transcodingJobs.id, jobId));
      await tx
        .update(videos)
        .set({ status: "processing", errorMessage: null, completedAt: null })
        .where(eq(videos.id, videoId));
    });
  }
  static async initRenditions(
    { videoId, jobId }: TrackedRun,
    renditions: readonly Rendition[],
  ): Promise<void> {
    await Database.db
      .insert(videoRenditions)
      .values(
        renditions.map((r) => ({
          videoId,
          jobId,
          name: r.name,
          height: r.height,
        })),
      )
      .onConflictDoUpdate({
        target: [videoRenditions.videoId, videoRenditions.name],
        set: {
          jobId,
          status: "pending",
          outputBucket: null,
          outputKey: null,
          sizeBytes: null,
          errorMessage: null,
          completedAt: null,
          updatedAt: new Date(),
        },
      });
  }
  static async renditionProcessing(
    { videoId }: TrackedRun,
    name: string,
  ): Promise<void> {
    await this.updateRendition(videoId, name, { status: "processing" });
  }
  static async renditionCompleted(
    { videoId }: TrackedRun,
    name: string,
    output: {
      bucket: string;
      key: string;
      sizeBytes: number;
    },
  ): Promise<void> {
    await this.updateRendition(videoId, name, {
      status: "completed",
      outputBucket: output.bucket,
      outputKey: output.key,
      sizeBytes: output.sizeBytes,
      completedAt: new Date(),
    });
  }
  static async complete({ videoId, jobId }: TrackedRun): Promise<void> {
    const now = new Date();
    await Database.db.transaction(async (tx) => {
      await tx
        .update(transcodingJobs)
        .set({ status: "succeeded", finishedAt: now })
        .where(eq(transcodingJobs.id, jobId));
      await tx
        .update(videos)
        .set({ status: "completed", errorMessage: null, completedAt: now })
        .where(eq(videos.id, videoId));
    });
  }
  static async fail(
    { videoId, jobId }: TrackedRun,
    err: unknown,
    renditionName: string | null,
  ): Promise<void> {
    const errorMessage = (
      err instanceof Error ? err.message : String(err)
    ).slice(0, MAX_ERROR_LENGTH);
    try {
      await Database.db.transaction(async (tx) => {
        if (renditionName) {
          await tx
            .update(videoRenditions)
            .set({ status: "failed", errorMessage })
            .where(
              and(
                eq(videoRenditions.videoId, videoId),
                eq(videoRenditions.name, renditionName),
              ),
            );
        }
        await tx
          .update(transcodingJobs)
          .set({ status: "failed", errorMessage, finishedAt: new Date() })
          .where(eq(transcodingJobs.id, jobId));
        await tx
          .update(videos)
          .set({ status: "failed", errorMessage })
          .where(eq(videos.id, videoId));
      });
    } catch (dbErr) {
      console.error("Could not mark video as failed:", dbErr);
    }
  }
  private static async updateRendition(
    videoId: string,
    name: string,
    values: Partial<typeof videoRenditions.$inferInsert>,
  ): Promise<void> {
    await Database.db
      .update(videoRenditions)
      .set(values)
      .where(
        and(
          eq(videoRenditions.videoId, videoId),
          eq(videoRenditions.name, name),
        ),
      );
  }
}
