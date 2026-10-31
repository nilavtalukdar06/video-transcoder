import { S3Client } from "@aws-sdk/client-s3";
import { Env } from "../config/env";

export abstract class S3 {
  private static client: S3Client | null = null;

  static getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: Env.AWS_REGION,
        // Keep checksum params out of presigned PUT URLs so browsers can upload with a plain PUT.
        requestChecksumCalculation: "WHEN_REQUIRED",
        credentials: {
          accessKeyId: Env.AWS_ACCESS_KEY,
          secretAccessKey: Env.AWS_SECRET_KEY,
        },
      });
    }
    return this.client;
  }
}
