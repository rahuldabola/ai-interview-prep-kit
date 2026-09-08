import { z } from "zod";
import { generateJson } from "../llm/geminiClient.js";
import { wrapUntrusted } from "../llm/promptSafety.js";
import { nextCounterFrom } from "./ids.js";
import type { Requirement } from "./types.js";

const rawRequirementSchema = z.object({
  text: z.string().min(1),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
});

const extractionSchema = z.object({
  company: z.string(),
  role_title: z.string(),
  seniority: z.string(),
  location: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(rawRequirementSchema),
});

export type ExtractionResult = z.infer<typeof extractionSchema>;

const SYSTEM = `You extract structured facts from a single job description. You do not invent
requirements, responsibilities, or facts that are not stated or clearly implied by the text.
If the description is thin, return a short list rather than padding it out. You distinguish
"must" requirements (stated as required, essential, "you have", "X+ years") from "nice"
requirements (stated as a bonus, plus, preferred, or "nice to have") based on the literal
wording used — do not treat every skill mentioned as equally required.`;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "your", "have", "years", "experience", "will",
  "this", "that", "are", "our", "team", "work", "role", "able", "using", "who",
]);

function significantTokens(text: string): string[] {
  return Array.from(new Set(text.toLowerCase().match(/[a-z0-9+.#]{3,}/g) ?? [])).filter(
    (t) => !STOPWORDS.has(t)
  );
}

/**
 * Deterministic guard against invention (Section 5/10: "inventing requirements a
 * description does not contain is worse than reporting there were few"). A requirement
 * survives only if at least one of its significant tokens actually appears in the JD text —
 * this is a coarse check by design, not a rewrite of the requirement, so it cannot itself
 * fabricate anything; it can only reject.
 */
function isGroundedInJd(requirementText: string, jd: string): boolean {
  const jdLower = jd.toLowerCase();
  const tokens = significantTokens(requirementText);
  if (tokens.length === 0) return true;
  return tokens.some((t) => jdLower.includes(t));
}

export interface ExtractRequirementsResult {
  company: string;
  roleTitle: string;
  seniority: string;
  location: string;
  responsibilities: string[];
  requirements: Requirement[];
  droppedUngrounded: number;
}

export async function extractRequirements(jd: string): Promise<ExtractRequirementsResult> {
  const prompt = [
    "Extract role facts and requirements from this job description.",
    wrapUntrusted("pasted_job_description", jd),
    "",
    "Return JSON with: company (best guess, empty string if not stated), role_title,",
    'seniority (e.g. "Senior", "Mid", "Junior", or "" if unclear), location (or ""),',
    "responsibilities (array of short strings), and requirements (array of",
    "{ text, kind: technical|behavioural|domain, priority: must|nice }).",
    "Keep each requirement text short and specific (one skill/qualification per item).",
  ].join("\n");

  const result = await generateJson({
    system: SYSTEM,
    prompt,
    schema: extractionSchema,
  });

  const makeId = nextCounterFrom("r", []);
  let dropped = 0;
  const requirements: Requirement[] = [];
  for (const raw of result.requirements) {
    if (!isGroundedInJd(raw.text, jd)) {
      dropped++;
      continue;
    }
    requirements.push({
      id: makeId(),
      text: raw.text,
      kind: raw.kind,
      priority: raw.priority,
      origin: "generated",
      pinned: false,
    });
  }

  return {
    company: result.company,
    roleTitle: result.role_title,
    seniority: result.seniority,
    location: result.location,
    responsibilities: result.responsibilities,
    requirements,
    droppedUngrounded: dropped,
  };
}
