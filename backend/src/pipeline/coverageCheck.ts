import type { Question, Requirement } from "./types.js";

/**
 * Deterministic, in-code coverage check (Section 3: "Comparing the extracted requirements
 * against the generated questions to find the gaps is likewise your code's decision to
 * make, not the model's"). A `must` requirement is covered if at least one question
 * references its id in `requirement_ids`. `nice` requirements do not block coverage but are
 * still reported if uncovered, since a thin kit should say so honestly (Section 10).
 */
export function checkCoverage(
  requirements: Requirement[],
  questions: Question[]
): { uncoveredMustIds: string[]; uncoveredNiceIds: string[] } {
  const covered = new Set<string>();
  for (const q of questions) {
    for (const rid of q.requirement_ids) covered.add(rid);
  }

  const uncoveredMustIds: string[] = [];
  const uncoveredNiceIds: string[] = [];
  for (const req of requirements) {
    if (covered.has(req.id)) continue;
    if (req.priority === "must") uncoveredMustIds.push(req.id);
    else uncoveredNiceIds.push(req.id);
  }
  return { uncoveredMustIds, uncoveredNiceIds };
}
