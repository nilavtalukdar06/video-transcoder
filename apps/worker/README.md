# @video-transcoder/worker

Background worker for the video transcoder. It is built like [`apps/api`](../api)
(Express + TypeScript ESM, same layered/class-based style) but is an internal
service: it exposes only health endpoints and has no sessions, auth, CORS, rate
limiting or Swagger docs.

## Stack

- **Runtime:** Node 20+, ESM, ES2022 · **Bundler:** tsup · **Dev runner:** tsx
- **Web:** Express 4 + helmet, compression
- **Data:** Postgres (`pg` + Drizzle, no schema yet)
- **Logging:** pino / pino-http (with `X-Request-Id` request-id middleware)
- **Config:** `@t3-oss/env-core` + zod, validated at startup

## Layout

```
src/
  config/env.ts        validated environment (Env)
  db/                  Postgres pool + Drizzle client (Database)
  lib/                 Logger, ApiError, ApiResponse, asyncHandler, QueueConsumer (SQS), S3Event, TranscoderTask (ECS)
  middlewares/         RequestId, ErrorHandler
  modules/health/      service / controller / routes
  routes/index.ts      mounts modules
  app.ts               App.create() -> configured express()
  server.ts            bootstrap + graceful shutdown
```

`server.ts` validates env, connects Postgres, starts the HTTP server, then
starts the SQS consumer. On `SIGTERM`/`SIGINT` (or an uncaught exception/unhandled rejection) it
stops the consumer and accepting connections, closes Postgres, and force-exits after 10s.

## Transcoding

The SQS consumer long-polls `SQS_URL` for S3 object-created events from the original bucket,
either delivered by an **EventBridge** rule (`detail-type: "Object Created"`) or as classic **S3
event notifications** (`ObjectCreated:*`). For each uploaded object it starts the transcoder as a Fargate task
(`ecs:RunTask`) with `SOURCE_KEY=<object key>` as a container environment override, then deletes
the message.

- If `RunTask` fails, the message is left on the queue and retried after the visibility timeout
  (configure a dead-letter queue to cap retries).
- Messages that are not object-created events (e.g. `Object Deleted`, `s3:TestEvent`), have an unparseable body, or
  come from a bucket other than `AWS_S3_BUCKET` start nothing and are deleted.
- The configured credentials need `ecs:RunTask` on the task definition and `iam:PassRole` for the
  task's execution and task roles.

| Variable               | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `ECS_CLUSTER`          | Cluster to run the task in                                   |
| `ECS_TASK_DEFINITION`  | Transcoder task definition (family or family:revision)       |
| `ECS_CONTAINER_NAME`   | Container name in the task definition (default `transcoder`) |
| `ECS_SUBNETS`          | Comma-separated subnet ids                                   |
| `ECS_SECURITY_GROUPS`  | Comma-separated security group ids                           |
| `ECS_ASSIGN_PUBLIC_IP` | `ENABLED` (default) or `DISABLED`                            |

## Getting started

```bash
pnpm install                 # from the repo root
docker compose up -d         # Postgres
cp .env.example .env
pnpm dev                     # tsx watch
# or
pnpm build && pnpm start
```

## Endpoints

| Method | Path            | Description          |
| ------ | --------------- | -------------------- |
| GET    | `/health`       | Liveness             |
| GET    | `/health/ready` | Readiness (Postgres) |

Default port is `4000` (the API uses `3000`).

## Scripts

| Script           | Purpose                          |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Dev server with hot reload (tsx) |
| `pnpm build`     | Bundle to `dist/` (tsup)         |
| `pnpm start`     | Run the production bundle        |
| `pnpm typecheck` | `tsc --noEmit`                   |
