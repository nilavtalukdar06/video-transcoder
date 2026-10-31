FROM node:22-slim AS build
WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/transcoder/package.json apps/transcoder/
RUN pnpm install --frozen-lockfile --filter @video-transcoder/transcoder...

COPY apps/transcoder apps/transcoder
RUN pnpm --filter @video-transcoder/transcoder build

FROM ubuntu:24.04

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/local/bin/node /usr/local/bin/node

WORKDIR /app
COPY --from=build /repo/apps/transcoder/dist ./dist
COPY apps/transcoder/.env ./.env

USER ubuntu

CMD ["node", "dist/index.js"]
