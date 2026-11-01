import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import { Env } from "../config/env";
import * as schema from "./schema";
const { Pool } = pg;
export abstract class Database {
  private static pool: pg.Pool | null = null;
  private static client: NodePgDatabase<typeof schema> | null = null;
  static get db(): NodePgDatabase<typeof schema> {
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
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    this.pool.on("error", (err) => {
      console.error("Unexpected postgres pool error:", err);
    });
    await this.pool.query("SELECT 1");
    this.client = drizzle(this.pool, { schema });
    console.log("Postgres connected");
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
      console.log("Postgres connection closed");
    }
  }
}
