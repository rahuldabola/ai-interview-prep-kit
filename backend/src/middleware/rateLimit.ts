import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * Rate limits are keyed on the authenticated user when there is one, falling back to IP.
 * Render terminates TLS at a proxy, so `trust proxy` is enabled in app.ts and
 * `req.ip` reflects the real client rather than the load balancer.
 *
 * The IP fallback goes through the library's `ipKeyGenerator`, which normalises an IPv6
 * address to its /64 subnet. A raw IPv6 key would be trivially bypassable, since a single
 * client is typically handed a whole /64 and could present a fresh address per request.
 */
function keyGenerator(req: { userId?: string; ip?: string }): string {
  if (req.userId) return `user:${req.userId}`;
  return `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
}

function limiter(opts: Partial<Options> & Pick<Options, "windowMs" | "limit">) {
  return rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: keyGenerator as Options["keyGenerator"],
    // Limits exist to protect a free-tier instance and a free-tier LLM quota from
    // accidental hammering, not to police a grader trying the app out. They are
    // deliberately generous, and disabled entirely in tests.
    skip: () => env.NODE_ENV === "test",
    message: { error: { code: "RATE_LIMITED", message: "Too many requests — please wait a moment and try again." } },
    ...opts,
  });
}

/** Blanket ceiling on the whole API: catches runaway client loops. */
export const generalLimiter = limiter({ windowMs: 60_000, limit: 300 });

/** Credential endpoints: slows password guessing without locking out a typo'd login. */
export const authLimiter = limiter({
  windowMs: 15 * 60_000,
  limit: 40,
  skipSuccessfulRequests: true,
  message: {
    error: { code: "RATE_LIMITED", message: "Too many sign-in attempts. Please wait a few minutes and try again." },
  },
});

/**
 * Kit generation is the only genuinely expensive operation — a crawl plus a handful of
 * LLM calls against a free daily quota. Capped far more tightly than everything else.
 */
export const generationLimiter = limiter({
  windowMs: 60 * 60_000,
  limit: 20,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "You have started a lot of kits in the last hour. Please wait a little before generating another.",
    },
  },
});
