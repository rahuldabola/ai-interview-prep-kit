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
 * Pulls the session token from either transport.
 *
 * The cookie is the primary mechanism, but the deployed frontend (Vercel) and API (Render)
 * sit on different registrable domains, which makes the session cookie a *third-party*
 * cookie in the browser's eyes. `SameSite=None; Secure` is set correctly, yet Safari's ITP,
 * Brave, and Chrome incognito all block third-party cookies outright — so a cookie-only
 * session simply cannot log in for a large share of real visitors. The `Authorization:
 * Bearer` header is immune to that policy, so the frontend sends both and whichever one
 * survives the browser's cookie rules authenticates the request.
 */
export function readSessionToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) return token;
  }
  return req.cookies?.[SESSION_COOKIE] ?? null;
}

/**
 * Requires a valid session. Section 1: "a signed-out visitor cannot reach protected
 * pages or endpoints" and "sensible handling of expired or invalid sessions" — both an
 * absent token and an expired/tampered one return a structured code so the frontend can
 * redirect to login, without leaking which case occurred.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = readSessionToken(req);
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
