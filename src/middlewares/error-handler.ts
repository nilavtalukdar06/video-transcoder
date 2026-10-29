import type { ErrorRequestHandler, RequestHandler } from "express";
import { Env } from "../config/env";
import { ApiError } from "../lib/api-error";
import type { ApiResponseBody } from "../lib/api-response";
import { Logger } from "../lib/logger";

/**
 * Terminal middleware pair: a 404 catch-all and the global error handler that
 * normalizes every thrown value into the standard response envelope.
 */
export abstract class ErrorHandler {
  /** Mounted after all routes: nothing matched → 404. */
  static notFound: RequestHandler = (req, _res, next) => {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
  };

  /** Global error handler. Must keep the 4-arg signature for Express. */
  static handle: ErrorRequestHandler = (err, req, res, _next) => {
    const apiError =
      err instanceof ApiError
        ? err
        : ApiError.internal(
            err instanceof Error ? err.message : "Internal server error",
            err,
          );

    const logPayload = {
      requestId: req.id,
      statusCode: apiError.statusCode,
      err: apiError,
    };
    if (apiError.statusCode >= 500) {
      Logger.error(logPayload, "Request failed");
    } else {
      Logger.warn(logPayload, "Request rejected");
    }

    // Hide internal error messages/details in production.
    const exposeDetails =
      apiError.isOperational || !Env.isProduction;
    const message = exposeDetails
      ? apiError.message
      : "Internal server error";

    const body: ApiResponseBody<null> & {
      details?: unknown;
      stack?: string;
    } = {
      success: false,
      message,
      data: null,
      requestId: req.id,
    };

    if (apiError.details !== undefined && exposeDetails) {
      body.details = apiError.details;
    }
    if (!Env.isProduction && apiError.stack) {
      body.stack = apiError.stack;
    }

    res.status(apiError.statusCode).json(body);
  };
}
