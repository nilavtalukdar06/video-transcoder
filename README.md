# video-transcoder

pnpm + Turborepo monorepo.

```
apps/
  api/   Express + TypeScript API (see apps/api/README.md)
```

## Getting started

```bash
pnpm install
docker compose up -d        # Postgres + Redis
pnpm dev                     # runs `dev` in every app, via turbo
```

## Common commands

Run from the repo root, fanned out to all apps via Turborepo:

| Script              | Purpose                    |
| -------------------- | --------------------------- |
| `pnpm dev`           | Start all apps in dev mode  |
| `pnpm build`         | Build all apps              |
| `pnpm start`         | Start all apps (production) |
| `pnpm typecheck`     | Type-check all apps         |
| `pnpm db:generate`   | Generate Drizzle migrations |
| `pnpm db:migrate`    | Apply Drizzle migrations    |
| `pnpm db:studio`     | Open Drizzle Studio         |

Scope a command to a single app with turbo's filter flag, e.g.
`pnpm turbo run dev --filter=@video-transcoder/api`.
