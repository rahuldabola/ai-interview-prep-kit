import type { Kit, Question, QuestionCategory } from "./types.js";

/**
 * Regeneration merge rule (Section 6 — "regenerating one section must not discard edits the
 * user has made elsewhere, and a question the user wrote or edited by hand must survive a
 * regeneration of its category"): within the targeted category, an item is replaced only if
 * it is still at origin "generated" AND not pinned. Anything the user edited, added by hand,
 * or explicitly pinned keeps its id, content, and position; freshly generated replacements
 * are appended after the kept items so ordering stays stable for the user.
 */
export function mergeQuestionCategory(
  existingQuestions: Question[],
  category: QuestionCategory,
  freshForCategory: Question[]
): Question[] {
  const kept: Question[] = [];
  const others: Question[] = [];
  for (const q of existingQuestions) {
    if (q.category !== category) {
      others.push(q);
      continue;
    }
    if (q.origin !== "generated" || q.pinned) {
      kept.push(q);
    }
    // else: origin "generated" and not pinned -> dropped, replaced by fresh generation below
  }
  return [...others, ...kept, ...freshForCategory];
}

/** Same rule as questions: the brief is only replaced if it's still untouched ("generated" and not pinned). */
export function mergeCompanyBrief(existing: Kit["company_brief"], fresh: Kit["company_brief"]): Kit["company_brief"] {
  if (existing.origin !== "generated" || existing.pinned) return existing;
  return fresh;
}
