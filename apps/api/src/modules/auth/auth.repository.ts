import { eq } from "drizzle-orm";
import { Database } from "../../db";
import { users, type NewUser, type User } from "../../db/schema";
export abstract class AuthRepository {
  static async findByEmail(email: string): Promise<User | undefined> {
    const rows = await Database.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0];
  }
  static async findById(id: string): Promise<User | undefined> {
    const rows = await Database.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0];
  }
  static async create(data: NewUser): Promise<User> {
    const rows = await Database.db.insert(users).values(data).returning();
    return rows[0]!;
  }
}
