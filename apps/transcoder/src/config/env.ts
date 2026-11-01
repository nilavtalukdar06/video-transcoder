import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AWS_REGION: z.string().min(1, "AWS_REGION is required"),
    AWS_S3_BUCKET: z.string().min(1, "AWS_S3_BUCKET is required"),
    AWS_S3_TRANSFORMED_BUCKET: z
      .string()
      .min(1, "AWS_S3_TRANSFORMED_BUCKET is required"),
    SOURCE_KEY: z.string().min(1).optional(),
    VIDEO_ID: z.string().uuid().optional(),
    JOB_ID: z.string().uuid().optional(),
    AWS_ACCESS_KEY: z.string().min(1).optional(),
    AWS_SECRET_KEY: z.string().min(1).optional(),
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

  static get DATABASE_URL(): string {
    return env.DATABASE_URL;
  }

  static get AWS_REGION(): string {
    return env.AWS_REGION;
  }

  static get AWS_S3_BUCKET(): string {
    return env.AWS_S3_BUCKET;
  }

  static get AWS_S3_TRANSFORMED_BUCKET(): string {
    return env.AWS_S3_TRANSFORMED_BUCKET;
  }

  static get SOURCE_KEY(): string | undefined {
    return env.SOURCE_KEY;
  }

  static get VIDEO_ID(): string | undefined {
    return env.VIDEO_ID;
  }

  static get JOB_ID(): string | undefined {
    return env.JOB_ID;
  }

  static get AWS_ACCESS_KEY(): string | undefined {
    return env.AWS_ACCESS_KEY;
  }

  static get AWS_SECRET_KEY(): string | undefined {
    return env.AWS_SECRET_KEY;
  }

  static validate(): void {
    void env.NODE_ENV;
  }
}
