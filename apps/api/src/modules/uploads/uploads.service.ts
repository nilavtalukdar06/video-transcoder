import { randomUUID } from "node:crypto";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { Env } from "../../config/env";
import { ApiError } from "../../lib/api-error";
import { S3 } from "../../lib/s3";

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const VIDEO_CONTENT_TYPE = "video/mp4";
const PRESIGN_TTL_SECONDS = 300;

export interface PresignedUpload {
  url: string;
  fields: Record<string, string>;
  key: string;
  maxSizeBytes: number;
  contentType: string;
  expiresIn: number;
}

export abstract class UploadsService {
  static async createVideoUpload(userId: string): Promise<PresignedUpload> {
    const key = `uploads/${userId}/${randomUUID()}.mp4`;

    try {
      const { url, fields } = await createPresignedPost(S3.getClient(), {
        Bucket: Env.AWS_S3_BUCKET,
        Key: key,
        Expires: PRESIGN_TTL_SECONDS,
        Fields: { "Content-Type": VIDEO_CONTENT_TYPE },
        Conditions: [
          ["content-length-range", 1, MAX_VIDEO_BYTES],
          ["eq", "$Content-Type", VIDEO_CONTENT_TYPE],
        ],
      });

      return {
        url,
        fields,
        key,
        maxSizeBytes: MAX_VIDEO_BYTES,
        contentType: VIDEO_CONTENT_TYPE,
        expiresIn: PRESIGN_TTL_SECONDS,
      };
    } catch (err) {
      throw ApiError.internal("Could not create upload URL", err);
    }
  }
}
