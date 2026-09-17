import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { readSessionToken } from "../src/middleware/requireAuth.js";

function req(parts: { authorization?: string; cookie?: string }): Request {
  return {
    headers: parts.authorization ? { authorization: parts.authorization } : {},
    cookies: parts.cookie ? { session: parts.cookie } : {},
  } as unknown as Request;
}

describe("readSessionToken", () => {
  it("reads the session cookie when that is all there is", () => {
    expect(readSessionToken(req({ cookie: "cookie-token" }))).toBe("cookie-token");
  });

  it("reads a bearer token when the browser blocked our cross-site cookie", () => {
    expect(readSessionToken(req({ authorization: "Bearer header-token" }))).toBe("header-token");
  });

  it("prefers the bearer token, so a stale cookie cannot shadow a fresh sign-in", () => {
    expect(readSessionToken(req({ authorization: "Bearer fresh", cookie: "stale" }))).toBe("fresh");
  });

  it("ignores a non-bearer or empty Authorization header", () => {
    expect(readSessionToken(req({ authorization: "Basic abc", cookie: "cookie-token" }))).toBe("cookie-token");
    expect(readSessionToken(req({ authorization: "Bearer   ", cookie: "cookie-token" }))).toBe("cookie-token");
  });

  it("returns null when there is no session at all", () => {
    expect(readSessionToken(req({}))).toBeNull();
  });
});
