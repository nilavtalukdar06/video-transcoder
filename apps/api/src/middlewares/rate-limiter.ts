import type { RequestHandler } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { Env } from "../config/env";
import { ApiError } from "../lib/api-error";
import { RedisClient } from "../redis";
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
              Number(
                (
                  rejection as {
                    msBeforeNext: number;
                  }
                ).msBeforeNext,
              ) / 1000,
            );
            res.setHeader("Retry-After", String(retryAfter));
            next(
              ApiError.tooMany("Too many requests, please slow down", {
                retryAfter,
              }),
            );
            return;
          }
          next(ApiError.internal("Rate limiter unavailable", rejection));
        });
    };
  }
}
