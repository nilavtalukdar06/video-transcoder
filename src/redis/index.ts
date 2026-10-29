import { Redis } from "ioredis";
import { Env } from "../config/env";
import { Logger } from "../lib/logger";

/**
 * Shared ioredis client. Abstract + static: a single connection is reused for
 * the session store, the rate limiter and health checks.
 */
export abstract class RedisClient {
  private static instance: Redis | null = null;

  static getClient(): Redis {
    if (!this.instance) {
      this.instance = new Redis(Env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      this.instance.on("error", (err) => {
        Logger.error({ err }, "Redis client error");
      });
      this.instance.on("connect", () => {
        Logger.info("Redis connected");
      });
    }
    return this.instance;
  }

  static async connect(): Promise<void> {
    const client = this.getClient();
    // ioredis connects eagerly; ping to verify the link is live before boot.
    await client.ping();
  }

  /** Readiness probe used by the health check. */
  static async ping(): Promise<boolean> {
    const result = await this.getClient().ping();
    return result === "PONG";
  }

  static async quit(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
      Logger.info("Redis connection closed");
    }
  }
}
