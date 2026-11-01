import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { Env } from "../config/env";
import { Logger } from "../lib/logger";

export abstract class ClickHouse {
  private static instance: ClickHouseClient | null = null;

  static getClient(): ClickHouseClient {
    if (!this.instance) {
      this.instance = createClient({
        url: Env.CLICKHOUSE_URL,
        username: Env.CLICKHOUSE_USERNAME,
        password: Env.CLICKHOUSE_PASSWORD,
      });
    }
    return this.instance;
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
      Logger.info("ClickHouse connection closed");
    }
  }
}
