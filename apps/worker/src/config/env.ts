import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const splitList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AWS_ACCESS_KEY: z.string().min(1, "AWS_ACCESS_KEY is required"),
    AWS_SECRET_KEY: z.string().min(1, "AWS_SECRET_KEY is required"),
    AWS_REGION: z.string().min(1, "AWS_REGION is required"),
    AWS_S3_BUCKET: z.string().min(1, "AWS_S3_BUCKET is required"),
    SQS_URL: z.string().url("SQS_URL must be a valid URL"),
    ECS_CLUSTER: z.string().min(1, "ECS_CLUSTER is required"),
    ECS_TASK_DEFINITION: z.string().min(1, "ECS_TASK_DEFINITION is required"),
    ECS_CONTAINER_NAME: z.string().min(1).default("transcoder"),
    ECS_SUBNETS: z
      .string()
      .min(1, "ECS_SUBNETS is required")
      .transform(splitList),
    ECS_SECURITY_GROUPS: z
      .string()
      .min(1, "ECS_SECURITY_GROUPS is required")
      .transform(splitList),
    ECS_ASSIGN_PUBLIC_IP: z.enum(["ENABLED", "DISABLED"]).default("ENABLED"),
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

  static get DATABASE_URL(): string {
    return env.DATABASE_URL;
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

  static get SQS_URL(): string {
    return env.SQS_URL;
  }

  static get ECS_CLUSTER(): string {
    return env.ECS_CLUSTER;
  }

  static get ECS_TASK_DEFINITION(): string {
    return env.ECS_TASK_DEFINITION;
  }

  static get ECS_CONTAINER_NAME(): string {
    return env.ECS_CONTAINER_NAME;
  }

  static get ECS_SUBNETS(): string[] {
    return env.ECS_SUBNETS;
  }

  static get ECS_SECURITY_GROUPS(): string[] {
    return env.ECS_SECURITY_GROUPS;
  }

  static get ECS_ASSIGN_PUBLIC_IP(): "ENABLED" | "DISABLED" {
    return env.ECS_ASSIGN_PUBLIC_IP;
  }

  static validate(): void {
    void env.NODE_ENV;
  }
}
