import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { corsOrigins, env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { kitsRouter } from "./routes/kits.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimit.js";

const MONGO_READY_STATE: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

export function createApp() {
  const app = express();

  // Render terminates TLS at its proxy. Without this, `req.ip` is the load balancer for
  // every visitor, which would make IP-keyed rate limiting a single shared bucket.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // This API serves JSON to a separate frontend origin; it renders no HTML of its own, so
  // the CSP/COEP defaults aimed at documents only get in the way of the CORS setup below.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false }));
  app.use(compression());

  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header at all: curl, health checks, the batch CLI. Not a browser, so
        // there is no cross-origin credential risk to guard against here.
        if (!origin) return callback(null, true);
        if (corsOrigins.includes(origin)) return callback(null, true);
        // Any preview deployment of the frontend project. Vercel gives every branch and
        // commit its own hostname, so an exact-match allowlist would break every preview
        // URL and leave only production working.
        if (env.CORS_ALLOW_VERCEL_PREVIEWS && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      // The export download reads the server-chosen filename from this header; without
      // exposing it, CORS hides it from the browser and every download is named "export".
      exposedHeaders: ["Content-Disposition"],
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(generalLimiter);

  // Liveness/readiness. Also the endpoint the frontend pings to wake a spun-down free-tier
  // instance before the user's first real request hits it.
  const health = (_req: express.Request, res: express.Response) => {
    const readyState = mongoose.connection.readyState;
    res.json({
      ok: true,
      env: env.NODE_ENV,
      db: MONGO_READY_STATE[readyState] ?? "unknown",
      llm: env.GEMINI_API_KEY ? "configured" : "missing",
      uptime_seconds: Math.round(process.uptime()),
    });
  };
  app.get("/health", health);
  // Alias: everything else the client calls lives under /api, so /api/health is the path
  // people (and uptime monitors) reach for first.
  app.get("/api/health", health);

  app.use("/api/auth", authRouter);
  app.use("/api/kits", kitsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } });
  });

  app.use(errorHandler);

  return app;
}
