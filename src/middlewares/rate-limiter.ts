import type { RequestHandler } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { Env } from "../config/env";
import { ApiError } from "../lib/api-error";
import { RedisClient } from "../redis";

/**
 * Redis-backed rate limiting via rate-limiter-flexible. Counters are atomic and
 * shared across every app instance pointing at the same Redis.
 */
export abstract class RateLimiter {
  private static limiter: RateLimiterRedis | null = null;

  private static get(): RateLimiterRedis {
    if (!this.limiter) {
      this.limiter = new RateLimiterRedis({
        storeClient: RedisClient.getClient(),
        keyPrefix: "rl",
        points: Env.RATE_LIMIT_POINTS,
        duration: Env.RATE_LIMIT_DURATION,
      });
    }
    return this.limiter;
  }

  /**
   * Build a middleware. `points` optionally overrides the default budget for
   * stricter endpoints (e.g. auth) by using a dedicated keyspace.
   */
  static middleware(options?: {
    points?: number;
    duration?: number;
    keyPrefix?: string;
  }): RequestHandler {
    const limiter =
      options == null
        ? this.get()
        : new RateLimiterRedis({
            storeClient: RedisClient.getClient(),
            keyPrefix: options.keyPrefix ?? "rl",
            points: options.points ?? Env.RATE_LIMIT_POINTS,
            duration: options.duration ?? Env.RATE_LIMIT_DURATION,
          });

    return (req, res, next) => {
      const key = req.ip ?? "unknown";
      limiter
        .consume(key)
        .then((result) => {
          res.setHeader("X-RateLimit-Remaining", result.remainingPoints);
          next();
        })
        .catch((rejection: unknown) => {
          if (
            rejection &&
            typeof rejection === "object" &&
            "msBeforeNext" in rejection
          ) {
            const retryAfter = Math.ceil(
              Number((rejection as { msBeforeNext: number }).msBeforeNext) /
                1000,
            );
            res.setHeader("Retry-After", String(retryAfter));
            next(
              ApiError.tooMany("Too many requests, please slow down", {
                retryAfter,
              }),
            );
            return;
          }
          // A genuine Redis failure — surface as internal, don't fail open.
          next(ApiError.internal("Rate limiter unavailable", rejection));
        });
    };
  }
}
