import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { Env } from "../config/env";
import { Logger } from "./logger";
const LOG_EVENTS_TABLE = "log_events";
export interface LogEventRow {
  event_id: string;
  video_id: string;
  job_id: string;
  log: string;
  metadata: string | null;
}
export abstract class ClickHouse {
  private static client: ClickHouseClient | null = null;
  private static getClient(): ClickHouseClient {
    if (!this.client) {
      this.client = createClient({
        url: Env.CLICKHOUSE_URL,
        username: Env.CLICKHOUSE_USERNAME,
        password: Env.CLICKHOUSE_PASSWORD,
      });
    }
    return this.client;
  }
  static async connect(): Promise<void> {
    const result = await this.getClient().ping();
    if (!result.success) throw result.error;
    Logger.info("ClickHouse connected");
  }
  static async ping(): Promise<boolean> {
    const result = await this.getClient().ping();
    return result.success;
  }
  static async insertLogEvents(rows: LogEventRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.getClient().insert({
      table: LOG_EVENTS_TABLE,
      values: rows,
      format: "JSONEachRow",
    });
  }
  static async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      Logger.info("ClickHouse connection closed");
    }
  }
}
