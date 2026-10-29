import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const HEADER = "x-request-id";

/**
 * Attaches a correlation id to every request. Reuses an inbound `X-Request-Id`
 * when present (e.g. from an upstream proxy), otherwise mints a new UUID. The
 * id is echoed back on the response and consumed by the logger.
 */
export abstract class RequestId {
  static handler(): RequestHandler {
    return (req, res, next) => {
      const incoming = req.headers[HEADER];
      const id =
        typeof incoming === "string" && incoming.length > 0
          ? incoming
          : randomUUID();
      req.id = id;
      res.setHeader("X-Request-Id", id);
      next();
    };
  }
}
