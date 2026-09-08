import { describe, expect, it } from "vitest";
import { buildSchedule } from "../src/pipeline/schedule.js";
import type { Question, Requirement } from "../src/pipeline/types.js";

function req(id: string, priority: "must" | "nice"): Requirement {
  return { id, text: `Requirement ${id}`, kind: "technical", priority, origin: "generated", pinned: false };
}

function q(id: string, requirement_ids: string[], difficulty: 1 | 2 | 3, category: Question["category"] = "technical"): Question {
  return { id, requirement_ids, category, prompt: `Q${id}`, answer_outline: "", difficulty, origin: "generated", pinned: false };
}

describe("buildSchedule", () => {
  it("produces exactly the number of days requested, even when it exceeds the question count", () => {
    const requirements = [req("r1", "must")];
    const questions = [q("q1", ["r1"], 2)];
    const schedule = buildSchedule(requirements, questions, 10);
    expect(schedule.days_available).toBe(10);
    expect(schedule.days).toHaveLength(10);
    expect(schedule.days.filter((d) => d.question_ids.length === 0)).toHaveLength(9);
  });

  it("collapses everything into a single day for a 1-day schedule", () => {
    const requirements = [req("r1", "must"), req("r2", "must")];
    const questions = [q("q1", ["r1"], 2), q("q2", ["r2"], 3), q("q3", [], 1, "company-fit")];
    const schedule = buildSchedule(requirements, questions, 1);
    expect(schedule.days).toHaveLength(1);
    expect(schedule.days[0]!.question_ids.sort()).toEqual(["q1", "q2", "q3"]);
  });

  it("every must-have requirement's covering question appears somewhere in the schedule", () => {
    const requirements = [req("r1", "must"), req("r2", "must"), req("r3", "nice")];
    const questions = [q("q1", ["r1"], 3), q("q2", ["r2"], 2), q("q3", ["r3"], 1)];
    const schedule = buildSchedule(requirements, questions, 3);
    const scheduledIds = new Set(schedule.days.flatMap((d) => d.question_ids));
    expect(scheduledIds.has("q1")).toBe(true);
    expect(scheduledIds.has("q2")).toBe(true);
  });

  it("front-loads must-priority and harder material onto earlier days", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const questions = [
      q("q-must-hard", ["r1"], 3),
      q("q-nice-easy", ["r2"], 1),
      q("q-uncategorised", [], 2, "company-fit"),
    ];
    const schedule = buildSchedule(requirements, questions, 3);
    expect(schedule.days[0]!.question_ids).toEqual(["q-must-hard"]);
  });

  it("every day has an integer minutes value", () => {
    const requirements = [req("r1", "must")];
    const questions = [q("q1", ["r1"], 2), q("q2", ["r1"], 3)];
    const schedule = buildSchedule(requirements, questions, 2);
    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });
});
