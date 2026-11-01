import { Router } from "express";
import { HealthRoutes } from "../modules/health/health.routes";
export abstract class WorkerRoutes {
  static router(): Router {
    const router = Router();
    router.use("/health", HealthRoutes.router());
    return router;
  }
}
