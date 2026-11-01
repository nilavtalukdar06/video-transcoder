import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Env } from "../../config/env";
import { ApiError } from "../../lib/api-error";
import { Logger } from "../../lib/logger";
import { S3 } from "../../lib/s3";
import { UploadsRepository } from "./uploads.repository";
export const VIDEO_CONTENT_TYPE = "video/mp4";
const PRESIGN_TTL_SECONDS = 300;
export interface PresignedUpload {
  videoId: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  key: string;
  contentType: string;
  expiresIn: number;
}
export abstract class UploadsService {
  static async createVideoUpload(userId: string): Promise<PresignedUpload> {
    const key = `uploads/${userId}/${randomUUID()}.mp4`;
    let video;
    try {
      video = await UploadsRepository.createVideo({
        userId,
        sourceBucket: Env.AWS_S3_BUCKET,
        sourceKey: key,
        status: "uploading",
      });
    } catch (err) {
      throw ApiError.internal("Could not create upload", err);
    }
    try {
      const url = await getSignedUrl(
        S3.getClient(),
        new PutObjectCommand({
          Bucket: Env.AWS_S3_BUCKET,
          Key: key,
          ContentType: VIDEO_CONTENT_TYPE,
        }),
        {
          expiresIn: PRESIGN_TTL_SECONDS,
          signableHeaders: new Set(["content-type"]),
        },
      );
      return {
        videoId: video.id,
        url,
        method: "PUT",
        headers: { "Content-Type": VIDEO_CONTENT_TYPE },
        key,
        contentType: VIDEO_CONTENT_TYPE,
        expiresIn: PRESIGN_TTL_SECONDS,
      };
    } catch (err) {
      await UploadsRepository.markVideoFailed(
        video.id,
        err instanceof Error ? err.message : "Could not create upload URL",
      ).catch((markErr) => {
        Logger.error(
          { err: markErr, videoId: video.id },
          "Could not mark video as failed",
        );
      });
      throw ApiError.internal("Could not create upload URL", err);
    }
  }
}
