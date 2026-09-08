import dns from "node:dns/promises";
import { env } from "../config/env.js";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // link-local
  if (a === 0) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true; // loopback
  if (normalized.startsWith("fe80")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
  if (normalized.startsWith("::ffff:")) {
    // IPv4-mapped IPv6
    return isPrivateIPv4(normalized.replace("::ffff:", ""));
  }
  return false;
}

/**
 * Rejects non-http(s) schemes and resolves+blocks private/loopback/link-local addresses,
 * per Section 11 ("reject private and loopback addresses in production"). The check is
 * skipped only when ALLOW_PRIVATE_HOSTS=true, which must only be set for local development
 * or the batch-eval fixture server described in Section 9 — never in a deployed environment.
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(`"${rawUrl}" is not a valid URL`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`Unsupported URL scheme "${url.protocol}"`);
  }

  if (env.ALLOW_PRIVATE_HOSTS) {
    return url;
  }

  const hostname = url.hostname;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new UnsafeUrlError("Refusing to fetch localhost in production mode");
  }

  let addresses: string[];
  try {
    const records = await dns.lookup(hostname, { all: true });
    addresses = records.map((r) => r.address);
  } catch {
    throw new UnsafeUrlError(`Could not resolve host "${hostname}"`);
  }

  for (const addr of addresses) {
    if (addr.includes(":") ? isPrivateIPv6(addr) : isPrivateIPv4(addr)) {
      throw new UnsafeUrlError(`Refusing to fetch private/loopback address (${hostname} -> ${addr})`);
    }
  }

  return url;
}
