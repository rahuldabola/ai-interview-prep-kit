import * as cheerio from "cheerio";
import type { DiscussionSnippet } from "../pipeline/types.js";

const DISCUSSION_DOMAINS = ["glassdoor.com", "teamblind.com", "reddit.com", "comparably.com", "indeed.com"];
const MAX_RESULTS = 5;

/**
 * Best-effort search for public discussion of a company's interview process, using
 * DuckDuckGo's key-free HTML endpoint (a "genuine free tier" per the brief — no signup,
 * no quota). This is intentionally a heuristic, not an authoritative source: DuckDuckGo's
 * HTML endpoint can rate-limit or change markup without notice, so every failure mode here
 * degrades to an empty result with the reason recorded, per Section 10 ("public discussion
 * turns up nothing at all" must be reported honestly, never fabricated).
 */
export async function searchPublicDiscussion(
  companyName: string
): Promise<{ snippets: DiscussionSnippet[]; note: string }> {
  const query = `"${companyName}" interview process questions`;
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  let html: string;
  try {
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (AIInterviewPrepKitBot research query)" },
    });
    if (!res.ok) {
      return { snippets: [], note: `Discussion search returned HTTP ${res.status}; skipped.` };
    }
    html = await res.text();
  } catch (err) {
    return { snippets: [], note: `Discussion search unavailable: ${(err as Error).message}` };
  }

  const $ = cheerio.load(html);
  const snippets: DiscussionSnippet[] = [];

  $(".result").each((_, el) => {
    if (snippets.length >= MAX_RESULTS) return;
    const link = $(el).find(".result__a").first();
    const href = link.attr("href");
    const title = link.text().trim();
    const snippetText = $(el).find(".result__snippet").text().replace(/\s+/g, " ").trim();
    if (!href || !snippetText) return;

    const isDiscussionSite = DISCUSSION_DOMAINS.some((d) => href.includes(d));
    if (!isDiscussionSite) return;

    snippets.push({ source: title || href, url: href, snippet: snippetText });
  });

  if (snippets.length === 0) {
    return { snippets: [], note: "No public discussion of this company's interview process was found." };
  }
  return { snippets, note: `Found ${snippets.length} public discussion snippet(s).` };
}
