import { KitModel, type KitDoc } from "../models/Kit.js";
import { runPipeline, PipelineError } from "../pipeline/runPipeline.js";
import { crawlCompanySite } from "../retrieval/crawler.js";
import { searchPublicDiscussion } from "../retrieval/discussionSearch.js";
import { generateCompanyBrief } from "../pipeline/companyBrief.js";
import {
  generateBehaviouralQuestions,
  generateCompanyFitQuestions,
  generateSystemDesignQuestions,
  generateTechnicalQuestions,
} from "../pipeline/generateQuestions.js";
import { buildSchedule } from "../pipeline/schedule.js";
import { mergeCompanyBrief, mergeQuestionCategory } from "../pipeline/mergeRegeneration.js";
import { nextCounterFrom } from "../pipeline/ids.js";
import { validateKit } from "../validation/kitSchema.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { Kit, QuestionCategory } from "../pipeline/types.js";
import mongoose from "mongoose";

/**
 * Fire-and-forget generation job. No separate queue infra (a free-tier trade-off,
 * documented in the README): the job runs on the same Express process, and its progress is
 * written to the Kit document as it goes so the frontend can poll GET /kits/:id and render
 * a live progress view. Any uncaught error marks the kit "failed" with a structured
 * message rather than leaving it stuck in "generating" forever (Section 13).
 */
export function startGeneration(kitId: string): void {
  void (async () => {
    const doc = await KitModel.findById(kitId);
    if (!doc) return;

    doc.status = "generating";
    (doc as any).progress = [];
    await doc.save();

    const input = doc.input!;
    try {
      const result = await runPipeline(
        { jd: input.jd, company_url: input.company_url, days: input.days },
        (event) => {
          void KitModel.updateOne({ _id: kitId }, { $push: { progress: event } }).exec();
        }
      );
      doc.kit = result.kit;
      (doc as any).skipped = result.skipped;
      doc.status = "ready";
      doc.error = null;
      await doc.save();
    } catch (err) {
      doc.status = "failed";
      doc.error = {
        code: err instanceof PipelineError ? err.code : "GENERATION_FAILED",
        message: (err as Error).message,
      };
      await doc.save();
    }
  })();
}

const CATEGORY_GENERATORS: Record<
  QuestionCategory,
  (kit: Kit, makeId: () => string) => Promise<import("../pipeline/types.js").Question[]>
> = {
  technical: (kit, makeId) => generateTechnicalQuestions(kit.role.requirements, new Set(kit.role.requirements.map((r) => r.id)), makeId),
  behavioural: (kit, makeId) => generateBehaviouralQuestions(kit.role.requirements, new Set(kit.role.requirements.map((r) => r.id)), makeId),
  "system-design": (kit, makeId) =>
    generateSystemDesignQuestions(
      kit.role.title,
      kit.role.seniority,
      kit.company_brief.hiring_process_notes,
      new Set(kit.role.requirements.map((r) => r.id)),
      makeId
    ),
  "company-fit": (kit, makeId) =>
    generateCompanyFitQuestions(kit.role.title, kit.company_brief.summary, new Set(kit.role.requirements.map((r) => r.id)), makeId),
};

/**
 * Regenerates exactly one section in place (Section 6). Edits/manual/pinned items in that
 * section survive (see pipeline/mergeRegeneration.ts); everything else in the kit is
 * untouched. The result is revalidated against Appendix A before saving.
 */
export async function regenerateSection(
  kitDoc: KitDoc & { _id: mongoose.Types.ObjectId },
  section: string
): Promise<{ kit: Kit; applied: boolean }> {
  const kit = kitDoc.kit as Kit;
  if (!kit) throw new HttpError(409, "KIT_NOT_READY", "This kit has not finished generating yet");

  if (section === "company_brief") {
    const crawl = await crawlCompanySite(kit.source.company_url);
    const discussion = await searchPublicDiscussion(kit.source.company);
    const fresh = await generateCompanyBrief(crawl.pages, discussion.snippets);
    const freshBrief: Kit["company_brief"] = {
      summary: fresh.summary,
      what_they_do: fresh.whatTheyDo,
      hiring_process_notes: fresh.hiringProcessNotes,
      sources: fresh.sources,
      origin: "generated",
      pinned: false,
    };
    const applied = kit.company_brief.origin === "generated" && !kit.company_brief.pinned;
    kit.company_brief = mergeCompanyBrief(kit.company_brief, freshBrief);
    kit.source.pages_used = crawl.pages.map((p) => p.url);
    return finalizeRegeneration(kit, applied);
  }

  if (section.startsWith("questions:")) {
    const category = section.split(":")[1] as QuestionCategory;
    const makeId = nextCounterFrom("q", kit.questions.map((q) => q.id));
    const fresh = await CATEGORY_GENERATORS[category](kit, makeId);
    const replaceable = kit.questions.filter((q) => q.category === category && q.origin === "generated" && !q.pinned).length;
    kit.questions = mergeQuestionCategory(kit.questions, category, fresh);
    return finalizeRegeneration(kit, replaceable > 0 || fresh.length > 0);
  }

  if (section === "schedule") {
    kit.schedule = buildSchedule(kit.role.requirements, kit.questions, kit.schedule.days_available);
    return finalizeRegeneration(kit, true);
  }

  throw new HttpError(400, "INVALID_SECTION", `Unknown section "${section}"`);
}

function finalizeRegeneration(kit: Kit, applied: boolean): { kit: Kit; applied: boolean } {
  const validation = validateKit(kit);
  if (!validation.valid) {
    throw new HttpError(500, "INVALID_KIT_STRUCTURE", "Regeneration produced an invalid kit structure");
  }
  return { kit, applied };
}
