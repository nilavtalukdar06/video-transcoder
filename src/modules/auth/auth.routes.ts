import { Router } from "express";
import { AuthGuard } from "../../middlewares/auth";
import { RateLimiter } from "../../middlewares/rate-limiter";
import { Validate } from "../../middlewares/validate";
import { AuthController } from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.schema";

/**
 * Auth routes. Abstract + static: exposes a configured Router. Register/login
 * get a stricter, dedicated rate-limit budget to blunt brute-force attempts.
 */
export abstract class AuthRoutes {
  static router(): Router {
    const router = Router();

    const strictLimiter = RateLimiter.middleware({
      keyPrefix: "rl:auth",
      points: 10,
      duration: 60,
    });

    router.post(
      "/register",
      strictLimiter,
      Validate.body(registerSchema),
      AuthController.register,
    );

    router.post(
      "/login",
      strictLimiter,
      Validate.body(loginSchema),
      AuthController.login,
    );

    router.post("/logout", AuthGuard.required, AuthController.logout);
    router.get("/me", AuthGuard.required, AuthController.me);

    return router;
  }
}
