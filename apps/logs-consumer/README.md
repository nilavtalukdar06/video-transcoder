# @video-transcoder/logs-consumer

Background worker that consumes the transcoder's logs from Kafka. It is built like
[`apps/worker`](../worker) (Express + TypeScript ESM, same layered/class-based style) and is an
internal service: it exposes only health endpoints and has no sessions, auth, CORS, rate limiting
or Swagger docs.

## Stack

- **Runtime:** Node 20+, ESM, ES2022 · **Bundler:** tsup · **Dev runner:** tsx
- **Web:** Express 4 + helmet, compression
- **Messaging:** Kafka (`kafkajs`)
- **Logging:** pino / pino-http (with `X-Request-Id` request-id middleware)
- **Config:** `@t3-oss/env-core` + zod, validated at startup

## Layout

```
src/
  config/env.ts        validated environment (Env)
  lib/                 Logger, ApiError, ApiResponse, asyncHandler, LogsConsumer (Kafka), LogMessageParser
  middlewares/         RequestId, ErrorHandler
  modules/health/      service / controller / routes
  routes/index.ts      mounts modules
  app.ts               App.create() -> configured express()
  server.ts            bootstrap + graceful shutdown
```

`server.ts` validates env, starts the HTTP server, then starts the Kafka consumer. On
`SIGTERM`/`SIGINT` (or an uncaught exception/unhandled rejection) it disconnects the consumer, stops
accepting connections, and force-exits after 10s.

## Consuming logs

`LogsConsumer` joins the `KAFKA_GROUP_ID` consumer group and subscribes to `KAFKA_LOGS_TOPIC`
(`transcoding-logs`), the topic `processLogs` in [`apps/transcoder`](../transcoder) produces to. Each
message is JSON `{ videoId, jobId, log, timestamp }`; it is validated and printed with `console.log`
with `videoId`/`jobId` as fields. Messages with an empty or unparseable body are logged as a warning
and skipped. A new group starts from the latest offset.

Kafka connection settings match the transcoder: `KAFKA_SSL` needs `ca.pem` in the working directory
(next to `package.json`, git-ignored), and `KAFKA_SASL` uses the `plain` mechanism.

| Variable           | Description                                  |
| ------------------ | -------------------------------------------- |
| `KAFKA_BROKER`     | Broker `host:port`                           |
| `KAFKA_SSL`        | `true` (default) or `false`                  |
| `KAFKA_SASL`       | `true` (default) or `false`                  |
| `KAFKA_USERNAME`   | SASL username                                |
| `KAFKA_PASSWORD`   | SASL password                                |
| `KAFKA_LOGS_TOPIC` | Topic to consume (default `transcoding-logs`) |
| `KAFKA_GROUP_ID`   | Consumer group id (default `logs-consumer`)  |

## Getting started

```bash
pnpm install                 # from the repo root
cp .env.example .env
cp ../transcoder/ca.pem .    # when KAFKA_SSL=true
pnpm dev                     # tsx watch
# or
pnpm build && pnpm start
```

## Endpoints

| Method | Path            | Description                        |
| ------ | --------------- | ---------------------------------- |
| GET    | `/health`       | Liveness                           |
| GET    | `/health/ready` | Readiness (Kafka consumer running) |

Default port is `4100` (the API uses `3000`, the worker `4000`).

## Scripts

| Script           | Purpose                          |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Dev server with hot reload (tsx) |
| `pnpm build`     | Bundle to `dist/` (tsup)         |
| `pnpm start`     | Run the production bundle        |
| `pnpm typecheck` | `tsc --noEmit`                   |
