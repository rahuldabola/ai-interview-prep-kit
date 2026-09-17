import { getStoredToken } from "./authToken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export { API_BASE };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly issues?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Distinguishes "the network/server never answered" from "the server answered with an error". */
export class NetworkError extends Error {
  constructor(message = "Could not reach the server.") {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * The API runs on a free Render instance that spins down after inactivity, and a cold boot
 * can take ~50s. A plain fetch would either hang with no explanation or fail instantly on a
 * dropped connection, so requests get a generous timeout and one transparent retry — long
 * enough to cover a wake-up, rather than surfacing a scary error for something that is
 * about to succeed.
 */
const REQUEST_TIMEOUT_MS = 75_000;

type Listener = (waking: boolean) => void;
const wakeListeners = new Set<Listener>();
let wakeTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightSlowRequests = 0;

/** Lets the UI show an honest "waking the server up" notice instead of a silent stall. */
export function onServerWaking(listener: Listener): () => void {
  wakeListeners.add(listener);
  return () => wakeListeners.delete(listener);
}

function emitWaking(waking: boolean) {
  for (const listener of wakeListeners) listener(waking);
}

/** A request still running after this long almost certainly hit a spun-down instance. */
const SLOW_REQUEST_NOTICE_MS = 2_500;

function beginSlowWatch() {
  inFlightSlowRequests += 1;
  if (!wakeTimer) {
    wakeTimer = setTimeout(() => emitWaking(true), SLOW_REQUEST_NOTICE_MS);
  }
}

function endSlowWatch() {
  inFlightSlowRequests = Math.max(0, inFlightSlowRequests - 1);
  if (inFlightSlowRequests === 0) {
    if (wakeTimer) {
      clearTimeout(wakeTimer);
      wakeTimer = null;
    }
    emitWaking(false);
  }
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  // Sent alongside the cookie; the backend accepts whichever arrives (see lib/authToken.ts).
  if (token) headers.Authorization = `Bearer ${token}`;

  const options: RequestInit = { ...init, credentials: "include", headers };

  beginSlowWatch();
  let res: Response;
  try {
    try {
      res = await rawFetch(path, options);
    } catch {
      // One retry: a cold instance frequently drops the very first connection as it boots.
      try {
        res = await rawFetch(path, options);
      } catch {
        throw new NetworkError(
          "Could not reach the server. It may be waking up from idle — please try again in a moment."
        );
      }
    }
  } finally {
    endSlowWatch();
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const error = body?.error ?? { code: "UNKNOWN_ERROR", message: `Request failed (${res.status})` };
    throw new ApiError(res.status, error.code, error.message, error.issues);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/**
 * Fire-and-forget wake-up ping on app load, so the instance is already booting while the
 * user reads the landing page rather than starting its ~50s cold start on their first click.
 */
export function warmUpServer(): void {
  void fetch(`${API_BASE}/api/health`, { method: "GET", credentials: "omit" }).catch(() => {});
}

/**
 * Downloads a file from an authenticated endpoint. A plain link cannot carry the bearer
 * header, so the bytes are fetched and handed to the browser as a blob instead.
 */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? "EXPORT_FAILED", body?.error?.message ?? "Could not export this kit.");
  }

  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackName;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
