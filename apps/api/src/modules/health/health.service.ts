import { Database } from "../../db";
import { RedisClient } from "../../redis";
export interface DependencyStatus {
  status: "up" | "down";
  latencyMs: number;
  error?: string;
}
export interface HealthReport {
  status: "ok" | "degraded";
  uptime: number;
  timestamp: string;
  dependencies: {
    postgres: DependencyStatus;
    redis: DependencyStatus;
  };
}
export abstract class HealthService {
  private static async probe(
    fn: () => Promise<boolean>,
  ): Promise<DependencyStatus> {
    const start = performance.now();
    try {
      const ok = await fn();
      const latencyMs = Math.round(performance.now() - start);
      return ok
        ? { status: "up", latencyMs }
        : { status: "down", latencyMs, error: "probe returned false" };
    } catch (err) {
      return {
        status: "down",
        latencyMs: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : "unknown error",
      };
    }
  }
  static async check(): Promise<HealthReport> {
    const [postgres, redis] = await Promise.all([
      this.probe(() => Database.ping()),
      this.probe(() => RedisClient.ping()),
    ]);
    const healthy = postgres.status === "up" && redis.status === "up";
    return {
      status: healthy ? "ok" : "degraded",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: { postgres, redis },
    };
  }
}
