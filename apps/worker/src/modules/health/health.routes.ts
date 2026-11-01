import { Router } from "express";
import { HealthController } from "./health.controller";
export abstract class HealthRoutes {
  static router(): Router {
    const router = Router();
    router.get("/", HealthController.live);
    router.get("/ready", HealthController.ready);
    return router;
  }
}
