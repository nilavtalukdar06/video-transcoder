import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { HealthRoutes } from "../modules/health/health.routes";

/**
 * API v1 router. Abstract + static: mounts every feature module under a single
 * versioned prefix.
 */
export abstract class ApiRoutes {
  static router(): Router {
    const router = Router();
    router.use("/health", HealthRoutes.router());
    router.use("/auth", AuthRoutes.router());
    return router;
  }
}
