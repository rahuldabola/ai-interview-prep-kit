import { z } from "zod";
import { generateJson } from "../llm/geminiClient.js";
import { wrapUntrusted } from "../llm/promptSafety.js";
import type { DiscussionSnippet, RetrievedPage } from "./types.js";

const briefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  hiring_process_notes: z.string(),
});

const SYSTEM = `You write a short, honest company brief for someone preparing for an interview.
You only use facts present in the provided pages and discussion snippets. If nothing useful
was retrieved, say so plainly instead of inventing details — a brief that admits "we could
not find public information about this company's hiring process" is far more useful than a
fabricated one.`;

export interface CompanyBriefResult {
  summary: string;
  whatTheyDo: string;
  hiringProcessNotes: string;
  sources: string[];
}

/**
 * Produces the company brief from whatever was actually retrieved. Deliberately a separate
 * LLM call from requirement extraction and question generation (Section 3: each step
 * responds to what was actually found) — its output (hiring_process_notes in particular)
 * is fed into generateQuestions so a company with a known take-home + system-design process
 * produces a different question mix than one with no discoverable process at all.
 */
export async function generateCompanyBrief(
  pages: RetrievedPage[],
  discussion: DiscussionSnippet[]
): Promise<CompanyBriefResult> {
  if (pages.length === 0 && discussion.length === 0) {
    return {
      summary: "No public information about this company could be retrieved.",
      whatTheyDo: "Unknown — the company website could not be crawled successfully.",
      hiringProcessNotes: "No hiring process information was found.",
      sources: [],
    };
  }

  const pageBlocks = pages
    .map((p, i) => wrapUntrusted(`company_page_${i + 1}:${p.url}`, `${p.title}\n${p.text.slice(0, 4000)}`))
    .join("\n\n");
  const discussionBlocks = discussion
    .map((d, i) => wrapUntrusted(`discussion_${i + 1}:${d.url}`, d.snippet))
    .join("\n\n");

  const prompt = [
    "Using ONLY the material below, write a company brief.",
    pageBlocks || "(no company pages were retrieved)",
    discussionBlocks || "(no public discussion was found)",
    "",
    "Return JSON with: summary (2-3 sentences, what an interview candidate should know),",
    "what_they_do (1-2 sentences on the product/business), and hiring_process_notes",
    "(what, if anything, is known about how this company interviews — stages, take-homes,",
    'system design rounds, etc. If nothing was found, say exactly: "No hiring process',
    'information was found.").',
  ].join("\n\n");

  const result = await generateJson({ system: SYSTEM, prompt, schema: briefSchema });

  return {
    summary: result.summary,
    whatTheyDo: result.what_they_do,
    hiringProcessNotes: result.hiring_process_notes,
    sources: [...pages.map((p) => p.url), ...discussion.map((d) => d.url)],
  };
}
