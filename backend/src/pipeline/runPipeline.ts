import { extractRequirements } from "./extractRequirements.js";
import { crawlCompanySite } from "../retrieval/crawler.js";
import { searchPublicDiscussion } from "../retrieval/discussionSearch.js";
import { generateCompanyBrief } from "./companyBrief.js";
import {
  generateCompanyFitQuestions,
  generateRequirementQuestions,
  generateSystemDesignQuestions,
  generateTargetedQuestions,
} from "./generateQuestions.js";
import { checkCoverage } from "./coverageCheck.js";
import { buildFlashcards } from "./flashcards.js";
import { buildSchedule } from "./schedule.js";
import { makeIdCounter } from "./ids.js";
import { COVERAGE, SCHEDULE } from "../config/constants.js";
import { validateKit } from "../validation/kitSchema.js";
import type { Kit, PipelineInput, PipelineResult, ProgressEvent, Question } from "./types.js";

export class PipelineError extends Error {
  constructor(message: string, public readonly code: string, public readonly cause?: unknown) {
    super(message);
    this.name = "PipelineError";
  }
}

type ProgressSink = (event: ProgressEvent) => void;

function emit(sink: ProgressSink | undefined, step: string, status: ProgressEvent["status"], message: string) {
  sink?.({ step, status, message, at: new Date().toISOString() });
}

function guessCompanyNameFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0] ?? host;
  } catch {
    return "the company";
  }
}

/**
 * The single, deliberate pipeline sequence described in Section 3-4 of the brief. Both the
 * Express `/kits` generate route and the `npm run evaluate` CLI call this exact function —
 * "the same code your application uses, not a parallel implementation" (Section 9).
 */
export async function runPipeline(input: PipelineInput, onProgress?: ProgressSink): Promise<PipelineResult> {
  const jd = input.jd.trim();
  const companyUrl = input.company_url.trim();
  const days = Math.min(SCHEDULE.MAX_DAYS, Math.max(SCHEDULE.MIN_DAYS, Math.round(input.days)));
  const skipped: PipelineResult["skipped"] = [];

  // Step 1: requirement extraction — pasted text, no retrieval needed.
  emit(onProgress, "extract_requirements", "started", "Extracting requirements from the job description");
  let extraction;
  try {
    extraction = await extractRequirements(jd);
  } catch (err) {
    emit(onProgress, "extract_requirements", "error", (err as Error).message);
    throw new PipelineError(
      `Failed to extract requirements from the job description: ${(err as Error).message}`,
      "EXTRACTION_FAILED",
      err
    );
  }
  emit(
    onProgress,
    "extract_requirements",
    "done",
    `Extracted ${extraction.requirements.length} requirement(s)` +
      (extraction.droppedUngrounded > 0 ? ` (dropped ${extraction.droppedUngrounded} not grounded in the JD)` : "")
  );

  // Step 2: crawl the company site — never fatal, always recorded.
  emit(onProgress, "crawl_company", "started", `Crawling ${companyUrl}`);
  const crawl = await crawlCompanySite(companyUrl);
  skipped.push(...crawl.skipped);
  if (crawl.pages.length === 0) {
    emit(onProgress, "crawl_company", "skipped", "No pages could be retrieved from the company site");
  } else {
    emit(onProgress, "crawl_company", "done", `Retrieved ${crawl.pages.length} page(s) from the company site`);
  }

  // Step 3: public discussion search — best-effort, honest on empty.
  const companyName = extraction.company || guessCompanyNameFromUrl(companyUrl);
  emit(onProgress, "discussion_search", "started", `Searching for public discussion of ${companyName}`);
  const discussion = await searchPublicDiscussion(companyName);
  emit(onProgress, "discussion_search", discussion.snippets.length > 0 ? "done" : "skipped", discussion.note);

  // Step 4: company brief — only from what was actually retrieved.
  emit(onProgress, "company_brief", "started", "Writing company brief");
  let brief;
  try {
    brief = await generateCompanyBrief(crawl.pages, discussion.snippets);
    emit(onProgress, "company_brief", "done", "Company brief ready");
  } catch (err) {
    emit(onProgress, "company_brief", "error", (err as Error).message);
    brief = {
      summary: "Company brief could not be generated due to an error.",
      whatTheyDo: "Unknown.",
      hiringProcessNotes: "No hiring process information was found.",
      sources: [],
    };
  }

  // Step 5: question generation — separate calls per requirement kind + system-design + company-fit.
  const requirements = extraction.requirements;
  const validRequirementIds = new Set(requirements.map((r) => r.id));
  const makeQuestionId = makeIdCounter("q");

  emit(onProgress, "generate_questions", "started", "Generating questions by category");
  let questions: Question[] = [];
  try {
    const [reqQuestions, systemDesignQuestions, companyFitQuestions] = await Promise.all([
      generateRequirementQuestions(requirements, validRequirementIds, makeQuestionId),
      generateSystemDesignQuestions(extraction.roleTitle, extraction.seniority, brief.hiringProcessNotes, validRequirementIds, makeQuestionId),
      generateCompanyFitQuestions(extraction.roleTitle, brief.summary, validRequirementIds, makeQuestionId),
    ]);
    questions = [...reqQuestions, ...systemDesignQuestions, ...companyFitQuestions];
    emit(onProgress, "generate_questions", "done", `Generated ${questions.length} question(s)`);
  } catch (err) {
    emit(onProgress, "generate_questions", "error", (err as Error).message);
    // Non-fatal: an empty/partial question bank still produces an honest (thin) kit; the
    // coverage step below will report the gap rather than the run aborting.
  }

  // Steps 6-7: deterministic coverage check + targeted second pass(es) (Section 4).
  emit(onProgress, "coverage_check", "started", "Checking requirement coverage");
  let passes = 1;
  let coverage = checkCoverage(requirements, questions);
  while (coverage.uncoveredMustIds.length > 0 && passes < COVERAGE.MAX_PASSES) {
    const targetRequirements = requirements.filter((r) => coverage.uncoveredMustIds.includes(r.id));
    try {
      const gapQuestions = await generateTargetedQuestions(targetRequirements, validRequirementIds, makeQuestionId);
      questions.push(...gapQuestions);
    } catch (err) {
      emit(onProgress, "coverage_check", "error", `Gap-filling pass ${passes + 1} failed: ${(err as Error).message}`);
      break;
    }
    passes++;
    coverage = checkCoverage(requirements, questions);
  }
  emit(
    onProgress,
    "coverage_check",
    coverage.uncoveredMustIds.length > 0 ? "skipped" : "done",
    coverage.uncoveredMustIds.length > 0
      ? `${coverage.uncoveredMustIds.length} must-have requirement(s) remain uncovered after ${passes} pass(es)`
      : `All must-have requirements covered after ${passes} pass(es)`
  );

  // Step 8: flashcards — deterministic transform, not a model call.
  const makeFlashcardId = makeIdCounter("f");
  const flashcards = buildFlashcards(requirements, questions, makeFlashcardId);

  // Step 9: schedule — deterministic allocator.
  emit(onProgress, "schedule", "started", `Building a ${days}-day schedule`);
  const schedule = buildSchedule(requirements, questions, days);
  emit(onProgress, "schedule", "done", `Schedule spans ${schedule.days.length} day(s)`);

  const kit: Kit = {
    source: {
      company: companyName,
      company_url: companyUrl,
      role: extraction.roleTitle,
      location: extraction.location,
      jd_chars: jd.length,
      researched_at: new Date().toISOString(),
      pages_used: crawl.pages.map((p) => p.url),
    },
    company_brief: {
      summary: brief.summary,
      what_they_do: brief.whatTheyDo,
      hiring_process_notes: brief.hiringProcessNotes,
      sources: brief.sources,
      origin: "generated",
      pinned: false,
    },
    role: {
      title: extraction.roleTitle,
      seniority: extraction.seniority,
      responsibilities: extraction.responsibilities,
      requirements,
    },
    questions,
    flashcards,
    schedule,
    coverage: {
      uncovered_requirement_ids: [...coverage.uncoveredMustIds, ...coverage.uncoveredNiceIds],
      passes,
    },
  };

  // Step 10: validate before handing back to caller (API persists it, CLI writes it).
  emit(onProgress, "validate", "started", "Validating kit structure");
  const validation = validateKit(kit);
  if (!validation.valid) {
    emit(onProgress, "validate", "error", `Kit failed structural validation: ${validation.issues.length} issue(s)`);
    throw new PipelineError(
      `Generated kit did not match the required structure: ${validation.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`,
      "INVALID_KIT_STRUCTURE"
    );
  }
  emit(onProgress, "validate", "done", "Kit structure valid");

  return { kit, skipped };
}
