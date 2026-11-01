import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
const env = createEnv({
  server: {
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
    AWS_ACCESS_KEY: z.string().min(1, "AWS_ACCESS_KEY is required"),
    AWS_SECRET_KEY: z.string().min(1, "AWS_SECRET_KEY is required"),
    AWS_REGION: z.string().min(1, "AWS_REGION is required"),
    AWS_S3_BUCKET: z.string().min(1, "AWS_S3_BUCKET is required"),
    CLICKHOUSE_URL: z.string().url("CLICKHOUSE_URL must be a valid URL"),
    CLICKHOUSE_USERNAME: z.string().min(1).default("default"),
    CLICKHOUSE_PASSWORD: z.string().min(1, "CLICKHOUSE_PASSWORD is required"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  onValidationError: (issues) => {
    const formatted = issues
      .map((i) => `  - ${i.path?.join(".") ?? "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  },
});
export abstract class Env {
  static get NODE_ENV(): (typeof env)["NODE_ENV"] {
    return env.NODE_ENV;
  }
  static get isProduction(): boolean {
    return env.NODE_ENV === "production";
  }
  static get isDevelopment(): boolean {
    return env.NODE_ENV === "development";
  }
  static get PORT(): number {
    return env.PORT;
  }
  static get CORS_ORIGIN(): string {
    return env.CORS_ORIGIN;
  }
  static get DATABASE_URL(): string {
    return env.DATABASE_URL;
  }
  static get REDIS_URL(): string {
    return env.REDIS_URL;
  }
  static get SESSION_SECRET(): string {
    return env.SESSION_SECRET;
  }
  static get SESSION_TTL(): number {
    return env.SESSION_TTL;
  }
  static get SESSION_COOKIE_NAME(): string {
    return env.SESSION_COOKIE_NAME;
  }
  static get RATE_LIMIT_POINTS(): number {
    return env.RATE_LIMIT_POINTS;
  }
  static get RATE_LIMIT_DURATION(): number {
    return env.RATE_LIMIT_DURATION;
  }
  static get AWS_ACCESS_KEY(): string {
    return env.AWS_ACCESS_KEY;
  }
  static get AWS_SECRET_KEY(): string {
    return env.AWS_SECRET_KEY;
  }
  static get AWS_REGION(): string {
    return env.AWS_REGION;
  }
  static get AWS_S3_BUCKET(): string {
    return env.AWS_S3_BUCKET;
  }
  static get CLICKHOUSE_URL(): string {
    return env.CLICKHOUSE_URL;
  }
  static get CLICKHOUSE_USERNAME(): string {
    return env.CLICKHOUSE_USERNAME;
  }
  static get CLICKHOUSE_PASSWORD(): string {
    return env.CLICKHOUSE_PASSWORD;
  }
  static validate(): void {
    void env.NODE_ENV;
  }
}
