import { spawn } from "node:child_process";

export interface Rendition {
  name: string;
  height: number;
}

export const RENDITIONS: readonly Rendition[] = [
  { name: "360p", height: 360 },
  { name: "480p", height: 480 },
  { name: "720p", height: 720 },
  { name: "1080p", height: 1080 },
];

const STDERR_TAIL_BYTES = 4_000;

export abstract class FFmpeg {
  static transcode(
    inputPath: string,
    outputPath: string,
    rendition: Rendition,
  ): Promise<void> {
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      inputPath,
      "-vf",
      `scale=-2:${rendition.height}`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ];

    return new Promise((resolve, reject) => {
      const proc = spawn("ffmpeg", args, {
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      proc.stderr.on("data", (chunk: Buffer) => {
        stderr = (stderr + chunk.toString()).slice(-STDERR_TAIL_BYTES);
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) return resolve();
        reject(
          new Error(
            `ffmpeg exited with code ${code} (${rendition.name}): ${stderr}`,
          ),
        );
      });
    });
  }
}
