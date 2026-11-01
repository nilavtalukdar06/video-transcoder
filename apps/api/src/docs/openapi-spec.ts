import { readFileSync } from "node:fs";
import path from "node:path";
import { load } from "js-yaml";
const SPEC_PATH = path.join(process.cwd(), "openapi.yaml");
export abstract class OpenApiSpec {
  private static cached: Record<string, unknown> | undefined;
  static load(): Record<string, unknown> {
    if (!this.cached) {
      const file = readFileSync(SPEC_PATH, "utf8");
      this.cached = load(file) as Record<string, unknown>;
    }
    return this.cached;
  }
}
