"use client";

const STORAGE_KEY = "aipk.session";

/**
 * Mirror of the httpOnly session cookie, used only as a fallback transport.
 *
 * The deployed frontend and API live on different domains (vercel.app / onrender.com), so
 * the session cookie is third-party from the browser's point of view — Safari, Brave and
 * Chrome's incognito mode drop it entirely. Keeping a copy of the token here and sending it
 * as an `Authorization: Bearer` header means sign-in works in those browsers too.
 *
 * The cookie remains the primary mechanism and is still httpOnly; this is strictly an
 * additional path for when the browser refuses to send it. localStorage is readable by
 * script on this origin, which is the accepted cost of the app being usable at all in
 * third-party-cookie-blocking browsers.
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode / blocked storage: fall back to cookie-only auth.
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore: the cookie path may still work.
  }
}
