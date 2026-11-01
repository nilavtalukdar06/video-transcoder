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

| Variable                            | Required | Description                                                                |
| ----------------------------------- | -------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`                      | yes      | Postgres connection string (must be reachable from the ECS task)           |
| `AWS_REGION`                        | yes      | AWS region                                                                 |
| `AWS_S3_BUCKET`                     | yes      | Original bucket (download + delete)                                        |
| `AWS_S3_TRANSFORMED_BUCKET`         | yes      | Transformed bucket, e.g. `video-transcoder-transformed`                    |
| `SOURCE_KEY`                        | yes\*    | Key of the video to transcode; set per task via a container override       |
| `VIDEO_ID` / `JOB_ID`               | yes\*    | UUIDs of the tracked `videos` / `transcoding_jobs` rows; set by the worker |
| `AWS_ACCESS_KEY` / `AWS_SECRET_KEY` | no       | Local runs only. On ECS the task role is used                              |
| `KAFKA_BROKER`                      | yes      | Kafka bootstrap broker the task logs are produced to                       |
| `KAFKA_SSL` / `KAFKA_SASL`          | no       | Default `true`. SSL reads the CA certificate from `ca.pem` (see below)     |
| `KAFKA_USERNAME` / `KAFKA_PASSWORD` | no       | SASL/PLAIN credentials, used when `KAFKA_SASL` is `true`                   |
| `KAFKA_LOGS_TOPIC`                  | no       | Topic the logs are produced to (default `transcoding-logs`)                 |

\* Not in `.env`: the worker provides `SOURCE_KEY`, `VIDEO_ID` and `JOB_ID` in the ECS task's runtime environment. It is optional in the env schema, but the task exits with an error if any is missing. For a local run, create a `videos` row and a `transcoding_jobs` row first and pass the values inline, e.g. `SOURCE_KEY=uploads/<userId>/<id>.mp4 VIDEO_ID=<uuid> JOB_ID=<uuid> pnpm dev`.

The task role needs `s3:GetObject` + `s3:DeleteObject` on the original bucket and `s3:PutObject` on the
transformed bucket.

## Status tracking

The task records its progress in Postgres: job `running` and video `processing` on start, every rendition
`pending` → `processing` → `completed` (output key and size), then job `succeeded` and video `completed` once the
original is deleted. If any step throws, the rendition in progress, the job and the video are marked `failed` with the
error message before the process exits `1`. A task that is killed outright (OOM, `SIGKILL`) cannot record anything.
See the full table in [`apps/api`](../api#status-tracking).

## Database

The transcoder connects to Postgres with Drizzle (`src/db`) before it starts and closes the pool when it
finishes. `src/db/schema.ts` is a copy of [`apps/api/src/db/schema.ts`](../api/src/db/schema.ts): the API
owns the schema and its migrations, so keep the files identical when the schema changes. It is copied
rather than imported because the Docker build context is this directory only.

## Scripts

| Script           | Purpose                   |
| ---------------- | ------------------------- |
| `pnpm dev`       | Run with hot reload (tsx) |
| `pnpm build`     | Bundle to `dist/` (tsup)  |
| `pnpm start`     | Run the production bundle |
| `pnpm typecheck` | `tsc --noEmit`            |
| `pnpm db:studio` | Drizzle Studio            |

Running locally needs `ffmpeg` on your `PATH` (`cp .env.example .env` first).

## Docker

The image is based on `ubuntu:24.04` with `ffmpeg` installed. The tsup bundle inlines all dependencies
(`noExternal`), so the image ships only `dist/` and the `node` binary. The build context is this
directory (it has no workspace dependencies), so build from `apps/transcoder`:

```bash
docker build -t video-transcoder-image .
docker run --rm video-transcoder-image
```

`.env` and `ca.pem` (the Kafka CA certificate) are copied into the image, so both must exist in this
directory before building. `ca.pem` is git-ignored; get it from your Kafka provider.
