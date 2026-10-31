# Build from the repo root (pnpm workspace + lockfile live there):
#   docker build -f apps/transcoder/Dockerfile -t transcoder .

# ---- build: compile TypeScript with tsup ----
FROM node:22-slim AS build
WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/transcoder/package.json apps/transcoder/
RUN pnpm install --frozen-lockfile --filter @video-transcoder/transcoder...

COPY apps/transcoder apps/transcoder
RUN pnpm --filter @video-transcoder/transcoder build

# ---- runtime: ubuntu base with ffmpeg ----
FROM ubuntu:24.04

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Node runtime (the bundle has no runtime dependencies, so only the binary is needed)
COPY --from=build /usr/local/bin/node /usr/local/bin/node

WORKDIR /app
COPY --from=build /repo/apps/transcoder/dist ./dist

# Ubuntu 24.04 ships a non-root "ubuntu" user
USER ubuntu

CMD ["node", "dist/index.js"]
