import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "es2022",
  platform: "node",
  outDir: "dist",
  clean: true,
  minify: true,
  sourcemap: true,
  dts: false,
  splitting: false,
  shims: false,
});
