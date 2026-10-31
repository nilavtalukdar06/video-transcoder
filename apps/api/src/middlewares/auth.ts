import type { RequestHandler } from "express";
import { ApiError } from "../lib/api-error";

export abstract class AuthGuard {
  static required: RequestHandler = (req, _res, next) => {
    if (!req.session?.userId) {
      next(ApiError.unauthorized("Authentication required"));
      return;
    }
    next();
  };
}
