# video-transcoder

A production-grade **Express + TypeScript (ESM)** API server with session-based
authentication, built on Drizzle (Postgres) and ioredis (Redis).

## Stack

- **Runtime:** Node 20+, ESM, ES2022
- **Bundler:** [tsup](https://tsup.egoist.dev/) · **Dev runner:** [tsx](https://tsx.is/)
- **Web:** Express 4 + helmet, cors, compression
- **ORM:** Drizzle ORM (`node-postgres`)
- **Logs:** ClickHouse (`@clickhouse/client`), filled by [`apps/logs-consumer`](../logs-consumer)
- **Cache / sessions / rate limiting:** ioredis + connect-redis + rate-limiter-flexible
- **Auth:** `express-session` (Redis store) + bcryptjs, users in Postgres
- **Logging:** pino / pino-http
- **Validation:** zod

Imports never need a `.js` extension: `moduleResolution: "Bundler"` keeps the
type-checker happy, `tsx` runs TS directly in dev, and `tsup` bundles to a single
ESM file for production.

## Architecture (layered, class-based)

Each layer is an **abstract class with static methods** — never instantiated,
used as a namespaced method bag:

```
Route  ->  Controller  ->  Service  ->  Repository  ->  Database
```

```
src/
  config/env.ts        validated environment (Env)
  db/                  Drizzle client (Database) + schema
  redis/               ioredis singleton (RedisClient)
  clickhouse/          ClickHouse client singleton (ClickHouse)
  lib/                 Logger, ApiError, ApiResponse, asyncHandler
  middlewares/         RequestId, RateLimiter, Validate, AuthGuard, ErrorHandler
  modules/
    auth/              repository / service / controller / routes / schema
    health/            service / controller / routes
    logs/              repository / service / controller / routes / schema
  routes/index.ts      mounts modules under /api/v1
  app.ts               App.create() -> configured express()
  server.ts            bootstrap + graceful shutdown
```

This app lives at `apps/api` inside a pnpm + Turborepo workspace. All commands
below can be run from this directory, or from the repo root via `pnpm turbo run <script>`.

## Getting started

```bash
# 1. Install (from the repo root)
pnpm install

# 2. Start Postgres + Redis (docker-compose.yml lives at the repo root)
docker compose up -d
docker compose ps        # both should report "healthy"

# 3. Configure
cp .env.example .env      # adjust SESSION_SECRET etc.

# 4. Create the schema
pnpm db:generate          # emit SQL migration into ./drizzle
pnpm db:migrate           # apply it

# 5. Run
pnpm dev                  # tsx watch (hot reload)
# or
pnpm build && pnpm start
```

## Database schema

`src/db/schema.ts` defines `users` plus the video-processing tables. This app owns the schema and all
migrations; `apps/worker` and `apps/transcoder` keep a mirrored copy of the file, so update those too
when it changes.

| Table              | Purpose                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `videos`           | One row per uploaded video (`source_bucket`/`source_key`, owner) with overall `video_status`             |
| `transcoding_jobs` | One row per transcoder (ECS) run of a video: `job_status`, `attempt`, `ecs_task_arn`, start/finish times |
| `video_renditions` | One row per output (360p, 480p, ...) with `rendition_status`, output bucket/key and size                 |

`video_status`: `uploading` → `uploaded` → `queued` → `processing` → `completed` / `failed`.
`job_status`: `pending` → `running` → `succeeded` / `failed`.
`rendition_status`: `pending` → `processing` → `completed` / `failed`.
Deleting a user cascades to their videos, jobs and renditions.

### Status tracking

Each service moves the rows through those statuses; any failed step marks the video (and the job and
rendition involved) `failed` with an `error_message`.

| Step                              | Owner      | Video        | Job         | Rendition                              |
| --------------------------------- | ---------- | ------------ | ----------- | -------------------------------------- |
| Presigned URL issued              | API        | `uploading`  |             |                                        |
| Presign fails                     | API        | `failed`     |             |                                        |
| S3 reports the object created     | worker     | `uploaded`   |             |                                        |
| Job created, before `ecs:RunTask` | worker     | `queued`     | `pending`   |                                        |
| `RunTask` fails                   | worker     | `failed`     | `failed`    |                                        |
| Task starts                       | transcoder | `processing` | `running`   | all `pending`                          |
| Each rendition                    | transcoder |              |             | `processing` → `completed` (key, size) |
| Original deleted                  | transcoder | `completed`  | `succeeded` |                                        |
| Any transcoder step fails         | transcoder | `failed`     | `failed`    | the one in progress `failed`           |

A redelivered SQS message for a video that is already `queued` (task started), `processing` or
`completed` is ignored. A `failed` video whose message is retried gets a new job (`attempt` + 1).

## API docs

Interactive Swagger UI is served at **`/docs`** (e.g. `http://localhost:3000/docs`),
backed by the OpenAPI 3.0 spec in [`openapi.yaml`](./openapi.yaml). The raw spec
is also available as JSON at `/docs/openapi.json`.

> The spec must be kept in sync with the routes/schemas by hand — see the root
> [AGENTS.md](../../AGENTS.md) for the rule that governs this.

## Endpoints

| Method | Path                            | Auth | Description                                                                                  |
| ------ | ------------------------------- | ---- | -------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/health`                | —    | Liveness                                                                                     |
| GET    | `/api/v1/health/ready`          | —    | Readiness (Postgres + Redis)                                                                 |
| POST   | `/api/v1/auth/register`         | —    | Create an account                                                                            |
| POST   | `/api/v1/auth/login`            | —    | Start a session (sets `sid`)                                                                 |
| POST   | `/api/v1/auth/logout`           | ✓    | Destroy the session                                                                          |
| GET    | `/api/v1/auth/me`               | ✓    | Current user profile                                                                         |
| POST   | `/api/v1/uploads/video/presign` | ✓    | Presigned S3 `PUT` URL for a video; creates the tracked `videos` row (`uploading`)           |
| GET    | `/api/v1/logs/:videoId`         | ✓    | Transcoder logs of one of your videos, from ClickHouse (`jobId`, `limit`, `offset`, `order`) |

### Logs

`GET /api/v1/logs/:videoId` reads the `log_events` ClickHouse table that `apps/logs-consumer` fills from
Kafka. It requires a session and only serves videos owned by the caller (404 otherwise). Query params:
`jobId` (uuid), `limit` (1-500, default 100), `offset` (default 0) and `order` (`asc` default, `desc`);
the response carries `hasMore` for paging. Needs `CLICKHOUSE_URL`, `CLICKHOUSE_USERNAME` and
`CLICKHOUSE_PASSWORD`.

### Quick smoke test

```bash
BASE=http://localhost:3000/api/v1

curl -s $BASE/health/ready | jq

curl -s -X POST $BASE/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"a@b.com","password":"password123","name":"Ada"}' | jq

curl -s -c cookies.txt -X POST $BASE/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"a@b.com","password":"password123"}' | jq

curl -s -b cookies.txt $BASE/auth/me | jq
curl -s -b cookies.txt -X POST $BASE/auth/logout | jq
```

## Scripts

| Script             | Purpose                          |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Dev server with hot reload (tsx) |
| `pnpm build`       | Bundle to `dist/` (tsup)         |
| `pnpm start`       | Run the production bundle        |
| `pnpm typecheck`   | `tsc --noEmit`                   |
| `pnpm db:generate` | Generate Drizzle migration       |
| `pnpm db:migrate`  | Apply migrations                 |
| `pnpm db:studio`   | Drizzle Studio                   |
