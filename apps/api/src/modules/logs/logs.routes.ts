import { Router } from "express";
import { AuthGuard } from "../../middlewares/auth";
import { RateLimiter } from "../../middlewares/rate-limiter";
import { Validate } from "../../middlewares/validate";
import { LogsController } from "./logs.controller";
import { logsParamsSchema, logsQuerySchema } from "./logs.schema";
export abstract class LogsRoutes {
  static router(): Router {
    const router = Router();
    const logsLimiter = RateLimiter.middleware({
      keyPrefix: "rl:logs",
      points: 60,
      duration: 60,
    });
    router.get(
      "/:videoId",
      AuthGuard.required,
      logsLimiter,
      Validate.params(logsParamsSchema),
      Validate.query(logsQuerySchema),
      LogsController.getVideoLogs,
    );
    return router;
  }
}
