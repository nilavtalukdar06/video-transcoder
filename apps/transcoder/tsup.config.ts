import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts"],
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
  noExternal: [/.*/],
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
