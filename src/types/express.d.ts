import "express";
import "express-session";

declare module "express-serve-static-core" {
  interface Request {
    /** Correlation id attached by the request-id middleware. */
    id: string;
  }
}

declare module "express-session" {
  interface SessionData {
    /** Primary key of the authenticated user, set on login. */
    userId?: string;
  }
}
