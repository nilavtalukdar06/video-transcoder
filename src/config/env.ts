import "dotenv/config";
import { z } from "zod";

/**
 * Environment schema. Validated once at process startup so the app fails fast
 * on misconfiguration instead of exploding deep inside a request.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default("*"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  SESSION_SECRET: z
    .string()
    .min(16, "SESSION_SECRET must be at least 16 characters"),
  SESSION_TTL: z.coerce.number().int().positive().default(86400),
  SESSION_COOKIE_NAME: z.string().default("sid"),

  RATE_LIMIT_POINTS: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_DURATION: z.coerce.number().int().positive().default(60),
});

type EnvShape = z.infer<typeof envSchema>;

/**
 * Typed, validated access to environment configuration. Abstract + static:
 * never instantiated, used purely as a namespaced accessor.
 */
export abstract class Env {
  private static cache: EnvShape | null = null;

  private static get values(): EnvShape {
    if (!this.cache) {
      const parsed = envSchema.safeParse(process.env);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
          .join("\n");
        throw new Error(`Invalid environment configuration:\n${issues}`);
      }
      this.cache = parsed.data;
    }
    return this.cache;
  }

  static get NODE_ENV(): EnvShape["NODE_ENV"] {
    return this.values.NODE_ENV;
  }

  static get isProduction(): boolean {
    return this.values.NODE_ENV === "production";
  }

  static get isDevelopment(): boolean {
    return this.values.NODE_ENV === "development";
  }

  static get PORT(): number {
    return this.values.PORT;
  }

  static get CORS_ORIGIN(): string {
    return this.values.CORS_ORIGIN;
  }

  static get DATABASE_URL(): string {
    return this.values.DATABASE_URL;
  }

  static get REDIS_URL(): string {
    return this.values.REDIS_URL;
  }

  static get SESSION_SECRET(): string {
    return this.values.SESSION_SECRET;
  }

  static get SESSION_TTL(): number {
    return this.values.SESSION_TTL;
  }

  static get SESSION_COOKIE_NAME(): string {
    return this.values.SESSION_COOKIE_NAME;
  }

  static get RATE_LIMIT_POINTS(): number {
    return this.values.RATE_LIMIT_POINTS;
  }

  static get RATE_LIMIT_DURATION(): number {
    return this.values.RATE_LIMIT_DURATION;
  }

  /** Force validation now (call during bootstrap for fail-fast behaviour). */
  static validate(): void {
    void this.values;
  }
}
