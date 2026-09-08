import { RETRIEVAL } from "../config/constants.js";
import { fetchAndCleanPage, FetchSkippedError } from "./fetchPage.js";
import { UnsafeUrlError } from "./urlSafety.js";
import type { RetrievedPage, SkippedSource } from "../pipeline/types.js";

/**
 * Keyword vocabulary used to rank discovered links by how likely they are to be a
 * hiring/about page. Deliberately not a fixed path list (Section 2: "the path cannot be
 * hard-coded") — every candidate link is scored from its href + anchor text, so a link
 * like /handbook/hiring-process or /engineering-blog/how-we-interview ranks just as well
 * as /careers would.
 */
const HIRING_KEYWORDS = [
  "career", "careers", "job", "jobs", "hiring", "hire", "join", "join-us", "joinus",
  "work-with-us", "work-here", "opening", "openings", "position", "positions",
  "employment", "vacanc", "recruit", "life-at", "people", "team", "culture",
  "interview", "process", "handbook", "how-we-hire",
];
const ABOUT_KEYWORDS = ["about", "who-we-are", "company", "mission", "story"];

function scoreLink(href: string, text: string): number {
  const haystack = `${href} ${text}`.toLowerCase();
  let score = 0;
  for (const kw of HIRING_KEYWORDS) {
    if (haystack.includes(kw)) score += 3;
  }
  for (const kw of ABOUT_KEYWORDS) {
    if (haystack.includes(kw)) score += 1;
  }
  return score;
}

function sameSite(a: URL, b: URL): boolean {
  const normalize = (h: string) => h.replace(/^www\./, "");
  return normalize(a.hostname) === normalize(b.hostname);
}

export interface CrawlResult {
  pages: RetrievedPage[];
  skipped: SkippedSource[];
}

/**
 * Crawls a company site starting from its homepage: fetches the homepage, ranks every
 * discovered same-site link against a hiring/about vocabulary, and fetches the
 * highest-ranked candidates breadth-first up to RETRIEVAL.MAX_PAGES total, honouring
 * RETRIEVAL.MAX_DEPTH. Unreachable pages are skipped and recorded, never fatal to the run.
 */
export async function crawlCompanySite(startUrl: string): Promise<CrawlResult> {
  const pages: RetrievedPage[] = [];
  const skipped: SkippedSource[] = [];
  const visited = new Set<string>();

  let homeUrl: URL;
  try {
    homeUrl = new URL(startUrl);
  } catch {
    skipped.push({ url: startUrl, reason: "Invalid company URL" });
    return { pages, skipped };
  }

  type Frontier = { url: string; score: number; depth: number };
  let frontier: Frontier[] = [{ url: homeUrl.toString(), score: Infinity, depth: 0 }];

  while (frontier.length > 0 && pages.length < RETRIEVAL.MAX_PAGES) {
    frontier.sort((a, b) => b.score - a.score);
    const { url, depth } = frontier.shift()!;
    const normalizedUrl = url.split("#")[0]!;
    if (visited.has(normalizedUrl)) continue;
    visited.add(normalizedUrl);

    let page: RetrievedPage & { links: { href: string; text: string }[] };
    try {
      page = await fetchAndCleanPage(normalizedUrl);
    } catch (err) {
      const reason =
        err instanceof FetchSkippedError || err instanceof UnsafeUrlError
          ? err.message
          : `Unexpected error: ${(err as Error).message}`;
      skipped.push({ url: normalizedUrl, reason });
      continue;
    }

    pages.push({ url: page.url, title: page.title, text: page.text });

    if (depth < RETRIEVAL.MAX_DEPTH) {
      const nextDepth = depth + 1;
      for (const link of page.links) {
        let linkUrl: URL;
        try {
          linkUrl = new URL(link.href);
        } catch {
          continue;
        }
        if (!sameSite(linkUrl, homeUrl)) continue;
        if (visited.has(linkUrl.toString().split("#")[0]!)) continue;
        const score = scoreLink(link.href, link.text);
        if (score <= 0 && nextDepth > 1) continue; // only follow unscored links one hop out
        frontier.push({ url: linkUrl.toString(), score, depth: nextDepth });
      }
    }
  }

  return { pages, skipped };
}
