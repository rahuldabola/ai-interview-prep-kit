import * as cheerio from "cheerio";
import { RETRIEVAL } from "../config/constants.js";
import { assertSafeUrl, UnsafeUrlError } from "./urlSafety.js";
import { isAllowedByRobots } from "./robots.js";
import type { RetrievedPage } from "../pipeline/types.js";

export class FetchSkippedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchSkippedError";
  }
}

const lastFetchByHost = new Map<string, number>();

async function politeDelay(host: string): Promise<void> {
  const last = lastFetchByHost.get(host) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < RETRIEVAL.PER_HOST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, RETRIEVAL.PER_HOST_DELAY_MS - elapsed));
  }
  lastFetchByHost.set(host, Date.now());
}

export interface FetchedRaw {
  url: string;
  html: string;
}

/**
 * Retrieves one page: URL safety check, robots.txt check, rate-limiting, content-type
 * and size limits, timeout. Throws FetchSkippedError for anything that should be recorded
 * and skipped rather than treated as fatal (Section 2: "Skip and report a source that
 * cannot be retrieved, rather than failing the whole run").
 */
export async function fetchRaw(rawUrl: string): Promise<FetchedRaw> {
  const url = await assertSafeUrl(rawUrl);

  const allowed = await isAllowedByRobots(url.toString()).catch(() => true);
  if (!allowed) {
    throw new FetchSkippedError(`Disallowed by robots.txt: ${url.toString()}`);
  }

  await politeDelay(url.host);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(RETRIEVAL.FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "AIInterviewPrepKitBot/1.0 (+research; respects robots.txt)" },
    });
  } catch (err) {
    if (err instanceof UnsafeUrlError) throw err;
    throw new FetchSkippedError(`Request failed for ${url.toString()}: ${(err as Error).message}`);
  }

  if (!res.ok) {
    throw new FetchSkippedError(`HTTP ${res.status} for ${url.toString()}`);
  }

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
  if (contentType && !RETRIEVAL.ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new FetchSkippedError(`Unexpected content-type "${contentType}" for ${url.toString()}`);
  }

  const contentLength = Number(res.headers.get("content-length") ?? "0");
  if (contentLength && contentLength > RETRIEVAL.MAX_BODY_BYTES) {
    throw new FetchSkippedError(`Response too large (${contentLength} bytes) for ${url.toString()}`);
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > RETRIEVAL.MAX_BODY_BYTES) {
    throw new FetchSkippedError(`Response exceeded size cap for ${url.toString()}`);
  }

  return { url: res.url || url.toString(), html: Buffer.from(buf).toString("utf-8") };
}

const NOISE_SELECTORS = ["script", "style", "noscript", "nav", "footer", "header", "svg", "iframe"];

/** Strips boilerplate and returns readable text plus discovered same-page links. */
export function cleanHtml(html: string, baseUrl: string): { title: string; text: string; links: { href: string; text: string }[] } {
  const $ = cheerio.load(html);
  NOISE_SELECTORS.forEach((sel) => $(sel).remove());

  const title = $("title").first().text().trim() || $("h1").first().text().trim();

  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const links: { href: string; text: string }[] = [];
  $("a[href]")
    .slice(0, RETRIEVAL.MAX_LINKS_PER_PAGE)
    .each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      try {
        const abs = new URL(href, baseUrl).toString();
        links.push({ href: abs, text: $(el).text().replace(/\s+/g, " ").trim() });
      } catch {
        // ignore malformed hrefs
      }
    });

  return { title, text, links };
}

/** Fetch + clean in one step, returning a RetrievedPage or throwing FetchSkippedError/UnsafeUrlError. */
export async function fetchAndCleanPage(url: string): Promise<RetrievedPage & { links: { href: string; text: string }[] }> {
  const raw = await fetchRaw(url);
  const { title, text, links } = cleanHtml(raw.html, raw.url);
  if (!text || text.length < 20) {
    throw new FetchSkippedError(`No usable text extracted from ${raw.url}`);
  }
  return { url: raw.url, title, text, links };
}
