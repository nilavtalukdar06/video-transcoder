# video-transcoder

A production-grade **Express + TypeScript (ESM)** API server with session-based
authentication, built on Drizzle (Postgres) and ioredis (Redis).

## Stack

- **Runtime:** Node 20+, ESM, ES2022
- **Bundler:** [tsup](https://tsup.egoist.dev/) · **Dev runner:** [tsx](https://tsx.is/)
- **Web:** Express 4 + helmet, cors, compression
- **ORM:** Drizzle ORM (`node-postgres`)
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
  lib/                 Logger, ApiError, ApiResponse, asyncHandler
  middlewares/         RequestId, RateLimiter, Validate, AuthGuard, ErrorHandler
  modules/
    auth/              repository / service / controller / routes / schema
    health/            service / controller / routes
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

## Endpoints

| Method | Path                    | Auth | Description                  |
| ------ | ----------------------- | ---- | ---------------------------- |
| GET    | `/api/v1/health`        | —    | Liveness                     |
| GET    | `/api/v1/health/ready`  | —    | Readiness (Postgres + Redis) |
| POST   | `/api/v1/auth/register` | —    | Create an account            |
| POST   | `/api/v1/auth/login`    | —    | Start a session (sets `sid`) |
| POST   | `/api/v1/auth/logout`   | ✓    | Destroy the session          |
| GET    | `/api/v1/auth/me`       | ✓    | Current user profile         |

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
| ------------------ | --------------------------------- |
| `pnpm dev`         | Dev server with hot reload (tsx) |
| `pnpm build`       | Bundle to `dist/` (tsup)         |
| `pnpm start`       | Run the production bundle        |
| `pnpm typecheck`   | `tsc --noEmit`                   |
| `pnpm db:generate` | Generate Drizzle migration       |
| `pnpm db:migrate`  | Apply migrations                 |
| `pnpm db:studio`   | Drizzle Studio                   |
