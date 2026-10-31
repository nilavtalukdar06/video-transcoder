import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Env } from "../config/env";

export abstract class S3 {
  private static client: S3Client | null = null;

  static getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: Env.AWS_REGION,
        ...(Env.AWS_ACCESS_KEY && Env.AWS_SECRET_KEY
          ? {
              credentials: {
                accessKeyId: Env.AWS_ACCESS_KEY,
                secretAccessKey: Env.AWS_SECRET_KEY,
              },
            }
          : {}),
      });
    }
    return this.client;
  }

  static async download(
    bucket: string,
    key: string,
    destPath: string,
  ): Promise<void> {
    const { Body } = await this.getClient().send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!Body) throw new Error(`s3://${bucket}/${key} has an empty body`);
    await pipeline(Body as Readable, createWriteStream(destPath));
  }

  static async upload(
    bucket: string,
    key: string,
    filePath: string,
    contentType: string,
  ): Promise<void> {
    await new Upload({
      client: this.getClient(),
      params: {
        Bucket: bucket,
        Key: key,
        Body: createReadStream(filePath),
        ContentType: contentType,
      },
    }).done();
  }

  static async delete(bucket: string, key: string): Promise<void> {
    await this.getClient().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }
}
