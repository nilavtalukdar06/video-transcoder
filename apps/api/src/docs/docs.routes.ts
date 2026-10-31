import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { OpenApiSpec } from "./openapi-spec";

export abstract class DocsRoutes {
  static router(): Router {
    const router = Router();
    const spec = OpenApiSpec.load();

    router.get("/openapi.json", (_req, res) => res.json(spec));
    router.use("/", swaggerUi.serve, swaggerUi.setup(spec));

    return router;
  }
}
