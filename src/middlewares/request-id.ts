import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const HEADER = "x-request-id";

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
