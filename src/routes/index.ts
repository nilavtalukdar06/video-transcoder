import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { HealthRoutes } from "../modules/health/health.routes";
import { UploadsRoutes } from "../modules/uploads/uploads.routes";

export abstract class ApiRoutes {
  static router(): Router {
    const router = Router();
    router.use("/health", HealthRoutes.router());
    router.use("/auth", AuthRoutes.router());
    router.use("/uploads", UploadsRoutes.router());
    return router;
  }
}
