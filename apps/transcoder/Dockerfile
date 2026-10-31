FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

COPY package.json ./
# Standalone workspace so pnpm allows esbuild's build script (mirrors the root pnpm-workspace.yaml)
RUN printf 'allowBuilds:\n  esbuild: true\n' > pnpm-workspace.yaml \
    && pnpm install

COPY . .
RUN pnpm build

FROM ubuntu:24.04

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/local/bin/node /usr/local/bin/node

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY .env ./.env

USER ubuntu

CMD ["node", "dist/index.js"]
