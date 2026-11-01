import { createServer } from "node:http";
import { App } from "./app";
import { Env } from "./config/env";
import { ClickHouse } from "./lib/clickhouse";
import { Logger } from "./lib/logger";
import { LogsConsumer } from "./lib/logs-consumer";
const SHUTDOWN_TIMEOUT_MS = 10000;
abstract class Server {
  private static httpServer: ReturnType<typeof createServer> | null = null;
  private static shuttingDown = false;
  static async start(): Promise<void> {
    Env.validate();
    await ClickHouse.connect();
    const app = App.create();
    this.httpServer = createServer(app);
    await new Promise<void>((resolve) => {
      this.httpServer!.listen(Env.PORT, () => {
        Logger.info(
          { port: Env.PORT, env: Env.NODE_ENV },
          `Logs consumer listening on port ${Env.PORT}`,
        );
        resolve();
      });
    });
    await LogsConsumer.start();
    this.registerSignalHandlers();
  }
  private static registerSignalHandlers(): void {
    const onSignal = (signal: string) => {
      Logger.info({ signal }, "Received shutdown signal");
      void this.shutdown(0);
    };
    process.on("SIGTERM", () => onSignal("SIGTERM"));
    process.on("SIGINT", () => onSignal("SIGINT"));
    process.on("uncaughtException", (err) => {
      Logger.error({ err }, "Uncaught exception");
      void this.shutdown(1);
    });
    process.on("unhandledRejection", (reason) => {
      Logger.error({ reason }, "Unhandled promise rejection");
      void this.shutdown(1);
    });
  }
  private static async shutdown(exitCode: number): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    const forceTimer = setTimeout(() => {
      Logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();
    try {
      await LogsConsumer.stop();
      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer!.close((err) => (err ? reject(err) : resolve()));
        });
        Logger.info("HTTP server closed");
      }
      await ClickHouse.close();
      clearTimeout(forceTimer);
      Logger.info("Shutdown complete");
      process.exit(exitCode);
    } catch (err) {
      Logger.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  }
}
Server.start().catch((err) => {
  Logger.error({ err }, "Failed to start logs consumer");
  process.exit(1);
});
