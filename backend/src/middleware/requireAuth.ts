import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE, verifyToken } from "../auth/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Requires a valid session cookie. Section 1: "a signed-out visitor cannot reach protected
 * pages or endpoints" and "sensible handling of expired or invalid sessions" — both an
 * absent cookie and an expired/tampered token return the same 401 with a structured code
 * so the frontend can redirect to login without leaking which case occurred.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: { code: "SESSION_EXPIRED", message: "Your session has expired, please sign in again" } });
    return;
  }
  req.userId = payload.userId;
  next();
}
