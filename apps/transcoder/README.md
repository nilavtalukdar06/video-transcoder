# @video-transcoder/transcoder

One-shot Node.js + TypeScript (ESM) job meant to run as an **AWS ECS task**, started by the
[worker](../worker). For the video at `SOURCE_KEY` it:

1. downloads it from the original bucket (`AWS_S3_BUCKET`)
2. transcodes it with ffmpeg (H.264/AAC MP4, `scale=-2:<height>`) into **360p, 480p, 720p and 1080p**
3. uploads each rendition to the transformed bucket (`AWS_S3_TRANSFORMED_BUCKET`)
4. deletes the original from the original bucket — only after all uploads succeeded

The process exits `0` on success and `1` on any failure (the original is left untouched), so the ECS task
status reflects the outcome.

Output keys drop the `uploads/` prefix and the extension of the source key:

```
s3://<AWS_S3_BUCKET>/uploads/<userId>/<id>.mp4
  -> s3://<AWS_S3_TRANSFORMED_BUCKET>/<userId>/<id>/{360p,480p,720p,1080p}.mp4
```

Every rendition is produced regardless of the source resolution (smaller sources are upscaled).

## Environment

| Variable                            | Required | Description                                                          |
| ----------------------------------- | -------- | -------------------------------------------------------------------- |
| `AWS_REGION`                        | yes      | AWS region                                                           |
| `AWS_S3_BUCKET`                     | yes      | Original bucket (download + delete)                                  |
| `AWS_S3_TRANSFORMED_BUCKET`         | yes      | Transformed bucket, e.g. `video-transcoder-transformed`              |
| `SOURCE_KEY`                        | yes\*    | Key of the video to transcode; set per task via a container override |
| `AWS_ACCESS_KEY` / `AWS_SECRET_KEY` | no       | Local runs only. On ECS the task role is used                        |

\* Not in `.env`: the worker provides `SOURCE_KEY` in the ECS task's runtime environment. It is optional in the env schema, but the task exits with an error if it is missing. For a local run, pass it inline, e.g. `SOURCE_KEY=uploads/<userId>/<id>.mp4 pnpm dev`.

The task role needs `s3:GetObject` + `s3:DeleteObject` on the original bucket and `s3:PutObject` on the
transformed bucket.

## Scripts

| Script           | Purpose                   |
| ---------------- | ------------------------- |
| `pnpm dev`       | Run with hot reload (tsx) |
| `pnpm build`     | Bundle to `dist/` (tsup)  |
| `pnpm start`     | Run the production bundle |
| `pnpm typecheck` | `tsc --noEmit`            |

Running locally needs `ffmpeg` on your `PATH` (`cp .env.example .env` first).

## Docker

The image is based on `ubuntu:24.04` with `ffmpeg` installed. The tsup bundle inlines all dependencies
(`noExternal`), so the image ships only `dist/` and the `node` binary. The build context is this
directory (it has no workspace dependencies), so build from `apps/transcoder`:

```bash
docker build -t video-transcoder-image .
docker run --rm video-transcoder-image
```

`.env` is copied into the image, so it must exist before building (`cp .env.example .env`).
