import { pino, type Logger as PinoLogger } from "pino";
import { Env } from "../config/env";

export abstract class Logger {
  private static instance: PinoLogger | null = null;

  static get(): PinoLogger {
    if (!this.instance) {
      this.instance = pino({
        level: Env.isProduction ? "info" : "debug",
        base: undefined,
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level: (label) => ({ level: label }),
        },
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "res.headers['set-cookie']",
            "*.password",
            "*.passwordHash",
          ],
          remove: true,
        },
        transport: Env.isProduction
          ? undefined
          : {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
              },
            },
      });
    }
    return this.instance;
  }

  static info(obj: unknown, msg?: string): void {
    this.get().info(obj as object, msg);
  }

  static error(obj: unknown, msg?: string): void {
    this.get().error(obj as object, msg);
  }

  static warn(obj: unknown, msg?: string): void {
    this.get().warn(obj as object, msg);
  }

  static debug(obj: unknown, msg?: string): void {
    this.get().debug(obj as object, msg);
  }
}
