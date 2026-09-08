import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/new", "/kits"];

/**
 * Coarse gate: redirects a signed-out visitor (no session cookie at all) away from
 * protected pages before the page even renders (Section 1). This only checks presence —
 * an expired/tampered token still reaches the page, where the API's 401 responses (see
 * requireAuth on the backend) drive the client-side redirect via useCurrentUser.
 */
export function proxy(req: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const hasSession = req.cookies.has("session");
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/new/:path*", "/kits/:path*"],
};
