import "express";
import "express-session";
declare module "express-serve-static-core" {
  interface Request {
    id: string;
  }
}
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}
