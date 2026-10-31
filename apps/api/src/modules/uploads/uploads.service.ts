import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Env } from "../../config/env";
import { ApiError } from "../../lib/api-error";
import { S3 } from "../../lib/s3";

export const VIDEO_CONTENT_TYPE = "video/mp4";
const PRESIGN_TTL_SECONDS = 300;

export interface PresignedUpload {
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
        url,
        method: "PUT",
        headers: { "Content-Type": VIDEO_CONTENT_TYPE },
        key,
        contentType: VIDEO_CONTENT_TYPE,
        expiresIn: PRESIGN_TTL_SECONDS,
      };
    } catch (err) {
      throw ApiError.internal("Could not create upload URL", err);
    }
  }
}
