import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";
import { Env } from "./config/env";
import { FFmpeg, RENDITIONS } from "./lib/ffmpeg";
import { processLogs } from "./lib/logs";
import { S3 } from "./lib/s3";
import { Tracking, type TrackedRun } from "./lib/tracking";
const OUTPUT_CONTENT_TYPE = "video/mp4";
export abstract class Transcoder {
  static async run(sourceKey: string, tracked: TrackedRun): Promise<void> {
    let currentRendition: string | null = null;
    const workDir = await mkdtemp(join(tmpdir(), "transcoder-"));
    try {
      await Tracking.start(tracked);
      await Tracking.initRenditions(tracked, RENDITIONS);
      const inputPath = join(workDir, "source");
      await processLogs(`Downloading s3://${Env.AWS_S3_BUCKET}/${sourceKey}`);
      await S3.download(Env.AWS_S3_BUCKET, sourceKey, inputPath);
      const outputPrefix = this.outputPrefix(sourceKey);
      for (const rendition of RENDITIONS) {
        const outputPath = join(workDir, `${rendition.name}.mp4`);
        const outputKey = `${outputPrefix}/${rendition.name}.mp4`;
        currentRendition = rendition.name;
        await Tracking.renditionProcessing(tracked, rendition.name);
        await processLogs(`Transcoding ${rendition.name}`);
        await FFmpeg.transcode(inputPath, outputPath, rendition);
        const { size } = await stat(outputPath);
        await processLogs(
          `Uploading s3://${Env.AWS_S3_TRANSFORMED_BUCKET}/${outputKey}`,
        );
        await S3.upload(
          Env.AWS_S3_TRANSFORMED_BUCKET,
          outputKey,
          outputPath,
          OUTPUT_CONTENT_TYPE,
        );
        await rm(outputPath, { force: true });
        await Tracking.renditionCompleted(tracked, rendition.name, {
          bucket: Env.AWS_S3_TRANSFORMED_BUCKET,
          key: outputKey,
          sizeBytes: size,
        });
        currentRendition = null;
      }
      await processLogs(
        `Deleting original s3://${Env.AWS_S3_BUCKET}/${sourceKey}`,
      );
      await S3.delete(Env.AWS_S3_BUCKET, sourceKey);
      await Tracking.complete(tracked);
      await processLogs("Transcoding completed");
    } catch (err) {
      await processLogs(
        `Transcoding failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      await Tracking.fail(tracked, err, currentRendition);
      throw err;
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }
  private static outputPrefix(sourceKey: string): string {
    const { dir, name } = parse(sourceKey);
    const parts = dir.split("/").filter(Boolean);
    if (parts[0] === "uploads") parts.shift();
    return [...parts, name].join("/");
  }
}
