import compression from "compression";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { Logger } from "./lib/logger";
import { ErrorHandler } from "./middlewares/error-handler";
import { RequestId } from "./middlewares/request-id";
import { LogsConsumerRoutes } from "./routes";
export abstract class App {
  static create(): Express {
    const app = express();
    app.set("trust proxy", 1);
    app.disable("x-powered-by");
    app.use(helmet());
    app.use(compression());
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true, limit: "1mb" }));
    app.use(RequestId.handler());
    app.use(
      pinoHttp({
        logger: Logger.get(),
        genReqId: (req) =>
          (
            req as {
              id?: string;
            }
          ).id ?? "unknown",
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return "error";
          if (res.statusCode >= 400) return "warn";
          return "info";
        },
      }),
    );
    app.use("/", LogsConsumerRoutes.router());
    app.use(ErrorHandler.notFound);
    app.use(ErrorHandler.handle);
    return app;
  }
}
