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
    const kafka = await this.probe(async () => LogsConsumer.isRunning);

    return {
      status: kafka.status === "up" ? "ok" : "degraded",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: { kafka },
    };
  }
}
