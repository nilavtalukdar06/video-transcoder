import { ClickHouse } from "../../lib/clickhouse";
import { LogsConsumer } from "../../lib/logs-consumer";
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
    kafka: DependencyStatus;
    clickhouse: DependencyStatus;
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
    const [kafka, clickhouse] = await Promise.all([
      this.probe(async () => LogsConsumer.isRunning),
      this.probe(() => ClickHouse.ping()),
    ]);
    return {
      status:
        kafka.status === "up" && clickhouse.status === "up" ? "ok" : "degraded",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: { kafka, clickhouse },
    };
  }
}
