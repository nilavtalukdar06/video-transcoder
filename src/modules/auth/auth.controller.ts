import type { Request } from "express";
import { ApiError } from "../../lib/api-error";
import { ApiResponse } from "../../lib/api-response";
import { asyncHandler } from "../../lib/async-handler";
import { AuthService } from "./auth.service";
import type { LoginInput, RegisterInput } from "./auth.schema";

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

export abstract class AuthController {
  static register = asyncHandler(async (req, res) => {
    const user = await AuthService.register(req.body as RegisterInput);
    ApiResponse.created(res, user, "Account created");
  });

  static login = asyncHandler(async (req, res) => {
    const user = await AuthService.login(req.body as LoginInput);

    await regenerateSession(req);
    req.session.userId = user.id;
    await saveSession(req);
    ApiResponse.ok(res, user, "Logged in");
  });

  static logout = asyncHandler(async (req, res) => {
    await destroySession(req);
    res.clearCookie(req.app.get("sessionCookieName") ?? "sid");
    ApiResponse.ok(res, null, "Logged out");
  });

  static me = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      throw ApiError.unauthorized("Authentication required");
    }
    const user = await AuthService.getProfile(userId);
    ApiResponse.ok(res, user, "OK");
  });
}
