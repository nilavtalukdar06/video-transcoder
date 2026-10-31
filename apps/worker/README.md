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
  lib/                 Logger, ApiError, ApiResponse, asyncHandler, QueueConsumer (SQS)
  middlewares/         RequestId, ErrorHandler
  modules/health/      service / controller / routes
  routes/index.ts      mounts modules
  app.ts               App.create() -> configured express()
  server.ts            bootstrap + graceful shutdown
```

`server.ts` validates env, connects Postgres, starts the HTTP server, then
starts the SQS consumer (long-polls `SQS_URL`, `console.log`s each message body,
then deletes it). On `SIGTERM`/`SIGINT` (or an uncaught exception/unhandled rejection) it
stops the consumer and accepting connections, closes Postgres, and force-exits after 10s.

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
