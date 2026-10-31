# @video-transcoder/transcoder

Node.js + TypeScript (ESM) service that will run ffmpeg. Currently it only logs a startup message.

- **Bundler:** tsup (`src/index.ts` -> `dist/index.js`) · **Dev runner:** tsx
- **Imports:** extensionless (`import { x } from "./x"`), resolved by tsup/tsx via `moduleResolution: Bundler`

## Scripts

| Script           | Purpose                          |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Run with hot reload (tsx)        |
| `pnpm build`     | Bundle to `dist/` (tsup)         |
| `pnpm start`     | Run the production bundle        |
| `pnpm typecheck` | `tsc --noEmit`                   |

## Docker

The image is based on `ubuntu:24.04` with `ffmpeg` installed. Build from the **repo root**:

```bash
docker build -f apps/transcoder/Dockerfile -t transcoder .
docker run --rm transcoder
```
