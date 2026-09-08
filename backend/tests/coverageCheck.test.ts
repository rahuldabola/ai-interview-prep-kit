import { describe, expect, it } from "vitest";
import { checkCoverage } from "../src/pipeline/coverageCheck.js";
import type { Question, Requirement } from "../src/pipeline/types.js";

function req(id: string, priority: "must" | "nice"): Requirement {
  return { id, text: `Requirement ${id}`, kind: "technical", priority, origin: "generated", pinned: false };
}

function q(id: string, requirement_ids: string[]): Question {
  return { id, requirement_ids, category: "technical", prompt: "", answer_outline: "", difficulty: 1, origin: "generated", pinned: false };
}

describe("checkCoverage", () => {
  it("flags a must requirement with no covering question", () => {
    const { uncoveredMustIds } = checkCoverage([req("r1", "must")], []);
    expect(uncoveredMustIds).toEqual(["r1"]);
  });

  it("does not flag a must requirement once a question references it", () => {
    const { uncoveredMustIds } = checkCoverage([req("r1", "must")], [q("q1", ["r1"])]);
    expect(uncoveredMustIds).toEqual([]);
  });

  it("reports nice-to-have gaps separately from must gaps", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const { uncoveredMustIds, uncoveredNiceIds } = checkCoverage(requirements, [q("q1", ["r1"])]);
    expect(uncoveredMustIds).toEqual([]);
    expect(uncoveredNiceIds).toEqual(["r2"]);
  });

  it("a question covering multiple requirements clears all of them", () => {
    const requirements = [req("r1", "must"), req("r2", "must")];
    const { uncoveredMustIds } = checkCoverage(requirements, [q("q1", ["r1", "r2"])]);
    expect(uncoveredMustIds).toEqual([]);
  });
});
