import { Router } from "express";
import { AuthGuard } from "../../middlewares/auth";
import { RateLimiter } from "../../middlewares/rate-limiter";
import { UploadsController } from "./uploads.controller";

export abstract class UploadsRoutes {
  static router(): Router {
    const router = Router();

    const presignLimiter = RateLimiter.middleware({
      keyPrefix: "rl:uploads",
      points: 20,
      duration: 60,
    });

    router.post(
      "/video/presign",
      AuthGuard.required,
      presignLimiter,
      UploadsController.presignVideo,
    );

    return router;
  }
}
