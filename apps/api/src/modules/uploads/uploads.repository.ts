import { eq } from "drizzle-orm";
import { Database } from "../../db";
import { videos, type NewVideo, type Video } from "../../db/schema";

export abstract class UploadsRepository {
  static async createVideo(data: NewVideo): Promise<Video> {
    const rows = await Database.db.insert(videos).values(data).returning();

    return rows[0]!;
  }

  static async markVideoFailed(
    id: string,
    errorMessage: string,
  ): Promise<void> {
    await Database.db
      .update(videos)
      .set({ status: "failed", errorMessage })
      .where(eq(videos.id, id));
  }
}
