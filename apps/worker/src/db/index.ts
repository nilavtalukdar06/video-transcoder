import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import { Env } from "../config/env";
import { Logger } from "../lib/logger";

const { Pool } = pg;

export abstract class Database {
  private static pool: pg.Pool | null = null;
  private static client: NodePgDatabase | null = null;

  static get db(): NodePgDatabase {
    if (!this.client) {
      throw new Error(
        "Database not initialized. Call Database.connect() first.",
      );
    }
    return this.client;
  }

  static async connect(): Promise<void> {
    if (this.client) return;

    this.pool = new Pool({
      connectionString: Env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    this.pool.on("error", (err) => {
      Logger.error({ err }, "Unexpected postgres pool error");
    });

    await this.pool.query("SELECT 1");
    this.client = drizzle(this.pool);
    Logger.info("Postgres connected");
  }

  static async ping(): Promise<boolean> {
    if (!this.client) return false;
    await this.client.execute(sql`SELECT 1`);
    return true;
  }

  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.client = null;
      Logger.info("Postgres connection closed");
    }
  }
}
