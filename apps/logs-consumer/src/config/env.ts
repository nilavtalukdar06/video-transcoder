import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4100),
    KAFKA_BROKER: z.string().min(1, "KAFKA_BROKER is required"),
    KAFKA_SSL: booleanString,
    KAFKA_SASL: booleanString,
    KAFKA_USERNAME: z.string().min(1).optional(),
    KAFKA_PASSWORD: z.string().min(1).optional(),
    KAFKA_LOGS_TOPIC: z.string().min(1).default("transcoding-logs"),
    KAFKA_GROUP_ID: z.string().min(1).default("logs-consumer"),
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

  static get KAFKA_BROKER(): string {
    return env.KAFKA_BROKER;
  }

  static get KAFKA_SSL(): boolean {
    return env.KAFKA_SSL;
  }

  static get KAFKA_SASL(): boolean {
    return env.KAFKA_SASL;
  }

  static get KAFKA_USERNAME(): string | undefined {
    return env.KAFKA_USERNAME;
  }

  static get KAFKA_PASSWORD(): string | undefined {
    return env.KAFKA_PASSWORD;
  }

  static get KAFKA_LOGS_TOPIC(): string {
    return env.KAFKA_LOGS_TOPIC;
  }

  static get KAFKA_GROUP_ID(): string {
    return env.KAFKA_GROUP_ID;
  }

  static validate(): void {
    void env.NODE_ENV;
  }
}
