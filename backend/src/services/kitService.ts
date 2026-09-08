import crypto from "node:crypto";
import { HttpError } from "../middleware/errorHandler.js";
import { checkCoverage } from "../pipeline/coverageCheck.js";
import { makeIdCounter, nextCounterFrom } from "../pipeline/ids.js";
import type { EditableMeta, Flashcard, Kit, Question, QuestionCategory, Requirement } from "../pipeline/types.js";

export function computeDedupeHash(userId: string, jd: string, companyUrl: string): string {
  return crypto
    .createHash("sha256")
    .update(`${userId}::${jd.trim()}::${companyUrl.trim()}`)
    .digest("hex");
}

function recomputeCoverage(kit: Kit): void {
  const { uncoveredMustIds, uncoveredNiceIds } = checkCoverage(kit.role.requirements, kit.questions);
  kit.coverage.uncovered_requirement_ids = [...uncoveredMustIds, ...uncoveredNiceIds];
}

function findOrThrow<T extends { id: string }>(list: T[], id: string, label: string): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new HttpError(404, "NOT_FOUND", `${label} "${id}" not found`);
  return item;
}

/** Any content-bearing patch (vs. a pinned-only toggle) flips origin to "edited" per the state model. */
function applyMeta<T extends EditableMeta>(item: T, patch: Partial<T>, contentKeys: (keyof T)[]): void {
  const touchesContent = contentKeys.some((k) => patch[k] !== undefined);
  Object.assign(item, patch);
  if (touchesContent) item.origin = "edited";
}

// ---- Requirements ----

export function editRequirement(kit: Kit, id: string, patch: Partial<Requirement>): Requirement {
  const req = findOrThrow(kit.role.requirements, id, "Requirement");
  applyMeta(req, patch, ["text", "kind", "priority"]);
  recomputeCoverage(kit);
  return req;
}

export function deleteRequirement(kit: Kit, id: string): void {
  const before = kit.role.requirements.length;
  kit.role.requirements = kit.role.requirements.filter((r) => r.id !== id);
  if (kit.role.requirements.length === before) {
    throw new HttpError(404, "NOT_FOUND", `Requirement "${id}" not found`);
  }
  for (const q of kit.questions) q.requirement_ids = q.requirement_ids.filter((rid) => rid !== id);
  for (const f of kit.flashcards) f.requirement_ids = f.requirement_ids.filter((rid) => rid !== id);
  recomputeCoverage(kit);
}

export function addRequirement(kit: Kit, data: { text: string; kind: Requirement["kind"]; priority: Requirement["priority"] }): Requirement {
  const makeId = nextCounterFrom("r", kit.role.requirements.map((r) => r.id));
  const req: Requirement = { id: makeId(), ...data, origin: "manual", pinned: true };
  kit.role.requirements.push(req);
  recomputeCoverage(kit);
  return req;
}

// ---- Questions ----

export function editQuestion(kit: Kit, id: string, patch: Partial<Question>): Question {
  const q = findOrThrow(kit.questions, id, "Question");
  applyMeta(q, patch, ["prompt", "answer_outline", "category", "difficulty", "requirement_ids"]);
  recomputeCoverage(kit);
  return q;
}

export function deleteQuestion(kit: Kit, id: string): void {
  const before = kit.questions.length;
  kit.questions = kit.questions.filter((q) => q.id !== id);
  if (kit.questions.length === before) throw new HttpError(404, "NOT_FOUND", `Question "${id}" not found`);
  for (const day of kit.schedule.days) day.question_ids = day.question_ids.filter((qid) => qid !== id);
  recomputeCoverage(kit);
}

export function addQuestion(
  kit: Kit,
  data: { category: QuestionCategory; prompt: string; answer_outline: string; difficulty: 1 | 2 | 3; requirement_ids: string[] }
): Question {
  const makeId = nextCounterFrom("q", kit.questions.map((q) => q.id));
  const validIds = new Set(kit.role.requirements.map((r) => r.id));
  const q: Question = {
    id: makeId(),
    ...data,
    requirement_ids: data.requirement_ids.filter((id) => validIds.has(id)),
    origin: "manual",
    pinned: true,
  };
  kit.questions.push(q);
  recomputeCoverage(kit);
  return q;
}

/** Reorders questions within one category to match `order` (a full list of that category's question ids). */
export function reorderQuestions(kit: Kit, category: QuestionCategory, order: string[]): void {
  const inCategory = kit.questions.filter((q) => q.category === category);
  const others = kit.questions.filter((q) => q.category !== category);
  const byId = new Map(inCategory.map((q) => [q.id, q]));
  if (order.length !== inCategory.length || order.some((id) => !byId.has(id))) {
    throw new HttpError(400, "INVALID_ORDER", "Order must contain exactly the current question ids for this category");
  }
  const reordered = order.map((id) => byId.get(id)!);
  kit.questions = [...others, ...reordered];
}

// ---- Flashcards ----

export function editFlashcard(kit: Kit, id: string, patch: Partial<Flashcard>): Flashcard {
  const f = findOrThrow(kit.flashcards, id, "Flashcard");
  applyMeta(f, patch, ["front", "back", "requirement_ids"]);
  return f;
}

export function deleteFlashcard(kit: Kit, id: string): void {
  const before = kit.flashcards.length;
  kit.flashcards = kit.flashcards.filter((f) => f.id !== id);
  if (kit.flashcards.length === before) throw new HttpError(404, "NOT_FOUND", `Flashcard "${id}" not found`);
}

export function addFlashcard(kit: Kit, data: { front: string; back: string; requirement_ids: string[] }): Flashcard {
  const makeId = nextCounterFrom("f", kit.flashcards.map((f) => f.id));
  const validIds = new Set(kit.role.requirements.map((r) => r.id));
  const f: Flashcard = {
    id: makeId(),
    ...data,
    requirement_ids: data.requirement_ids.filter((id) => validIds.has(id)),
    origin: "manual",
    pinned: true,
  };
  kit.flashcards.push(f);
  return f;
}

// ---- Company brief ----

export function editCompanyBrief(kit: Kit, patch: Partial<Kit["company_brief"]>): Kit["company_brief"] {
  applyMeta(kit.company_brief, patch, ["summary", "what_they_do", "hiring_process_notes"]);
  return kit.company_brief;
}

export { makeIdCounter };
