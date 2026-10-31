# Agent instructions

## Keep API docs in sync

`apps/api/openapi.yaml` is the source of truth for the API's OpenAPI 3.0 spec
and is served live as Swagger UI at `/docs` (raw spec at `/docs/openapi.json`).
It is hand-maintained, not generated.

**Whenever a change touches the API's HTTP contract, update
`apps/api/openapi.yaml` in the same change.** This includes:

- Adding, removing, or renaming a route (`*.routes.ts`)
- Changing a request body/query/param schema (e.g. `*.schema.ts`, zod schemas)
- Changing a response shape, status code, or error case returned by a
  controller/service
- Changing auth/session requirements on a route (e.g. `AuthGuard`, cookie
  behavior) or rate-limit behavior that's user-visible
- Adding a new module/resource under `apps/api/src/modules/`

Concretely:

1. Update the relevant `paths` entry (or add a new one) in `openapi.yaml`,
   including request body, all realistic response status codes, and auth
   (`security: [cookieAuth: []]`) if the route requires a session.
2. Update/add shared schemas under `components.schemas` if the data shape
   changed (e.g. `User`, `PresignedUpload`).
3. Update `apps/api/README.md`'s endpoint table to match.
4. Sanity-check the spec by starting the dev server and loading `/docs` (or
   `GET /docs/openapi.json`) — Swagger UI will fail to render on invalid YAML.

Do not consider an API change done until the spec reflects it.
