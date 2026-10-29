import RedisStore from "connect-redis";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import session from "express-session";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { Env } from "./config/env";
import { Logger } from "./lib/logger";
import { ErrorHandler } from "./middlewares/error-handler";
import { RateLimiter } from "./middlewares/rate-limiter";
import { RequestId } from "./middlewares/request-id";
import { RedisClient } from "./redis";
import { ApiRoutes } from "./routes";

/**
 * Builds the fully configured Express application. Abstract + static: there is
 * exactly one app; `create()` returns it ready to be handed to an http server.
 */
export abstract class App {
  static create(): Express {
    const app = express();

    // Behind a load balancer / reverse proxy: trust X-Forwarded-* so secure
    // cookies and req.ip work correctly.
    app.set("trust proxy", 1);
    app.set("sessionCookieName", Env.SESSION_COOKIE_NAME);
    app.disable("x-powered-by");

    // --- Security & payload middleware ---
    app.use(helmet());
    app.use(
      cors({
        origin: Env.CORS_ORIGIN === "*" ? true : Env.CORS_ORIGIN.split(","),
        credentials: true,
      }),
    );
    app.use(compression());
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true, limit: "1mb" }));
    app.use(cookieParser());

    // --- Observability ---
    app.use(RequestId.handler());
    app.use(
      pinoHttp({
        logger: Logger.get(),
        genReqId: (req) => (req as { id?: string }).id ?? "unknown",
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return "error";
          if (res.statusCode >= 400) return "warn";
          return "info";
        },
      }),
    );

    // --- Session (Redis-backed) ---
    app.use(
      session({
        name: Env.SESSION_COOKIE_NAME,
        secret: Env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        store: new RedisStore({
          client: RedisClient.getClient(),
          prefix: "sess:",
          ttl: Env.SESSION_TTL,
        }),
        cookie: {
          httpOnly: true,
          secure: Env.isProduction,
          sameSite: "lax",
          maxAge: Env.SESSION_TTL * 1000,
        },
      }),
    );

    // --- Global rate limiter ---
    app.use(RateLimiter.middleware());

    // --- Routes ---
    app.use("/api/v1", ApiRoutes.router());

    // --- Terminal handlers ---
    app.use(ErrorHandler.notFound);
    app.use(ErrorHandler.handle);

    return app;
  }
}
