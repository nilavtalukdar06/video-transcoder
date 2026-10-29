import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { ApiError } from "../lib/api-error";

type Source = "body" | "query" | "params";

/**
 * Zod-based request validation. Each static builder returns a middleware that
 * validates one request segment and replaces it with the parsed (and coerced)
 * value, so downstream handlers receive typed, trusted input.
 */
export abstract class Validate {
  private static make(schema: ZodTypeAny, source: Source): RequestHandler {
    return (req, _res, next) => {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const flat = result.error.flatten();
        next(
          ApiError.badRequest("Validation failed", {
            fieldErrors: flat.fieldErrors,
            formErrors: flat.formErrors,
          }),
        );
        return;
      }
      // query/params are read-only getters on newer Express typings; assign via
      // Object.assign to stay compatible.
      Object.assign(req[source] as object, result.data);
      next();
    };
  }

  static body(schema: ZodTypeAny): RequestHandler {
    return this.make(schema, "body");
  }

  static query(schema: ZodTypeAny): RequestHandler {
    return this.make(schema, "query");
  }

  static params(schema: ZodTypeAny): RequestHandler {
    return this.make(schema, "params");
  }
}
