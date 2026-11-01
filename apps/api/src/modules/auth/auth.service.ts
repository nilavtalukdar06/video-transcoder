import bcrypt from "bcryptjs";
import { ApiError } from "../../lib/api-error";
import type { User } from "../../db/schema";
import { AuthRepository } from "./auth.repository";
import type { LoginInput, RegisterInput } from "./auth.schema";
export type SafeUser = Omit<User, "passwordHash">;
const BCRYPT_ROUNDS = 12;
export abstract class AuthService {
  private static toSafeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
  static async register(input: RegisterInput): Promise<SafeUser> {
    const existing = await AuthRepository.findByEmail(input.email);
    if (existing) {
      throw ApiError.conflict("An account with that email already exists");
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await AuthRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });
    return this.toSafeUser(user);
  }
  static async login(input: LoginInput): Promise<SafeUser> {
    const user = await AuthRepository.findByEmail(input.email);
    const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinv";
    const valid = await bcrypt.compare(input.password, hash);
    if (!user || !valid) {
      throw ApiError.unauthorized("Invalid email or password");
    }
    return this.toSafeUser(user);
  }
  static async getProfile(userId: string): Promise<SafeUser> {
    const user = await AuthRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    return this.toSafeUser(user);
  }
}
