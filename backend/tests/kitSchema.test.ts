import { describe, expect, it } from "vitest";
import { validateKit } from "../src/validation/kitSchema.js";
import type { Kit } from "../src/pipeline/types.js";

function validKit(): Kit {
  return {
    source: {
      company: "Acme",
      company_url: "http://localhost:8099/",
      role: "Backend Engineer",
      location: "Remote",
      jd_chars: 120,
      researched_at: new Date().toISOString(),
      pages_used: ["http://localhost:8099/"],
    },
    company_brief: {
      summary: "Acme builds robots.",
      what_they_do: "Warehouse robotics.",
      hiring_process_notes: "Unknown.",
      sources: [],
      origin: "generated",
      pinned: false,
    },
    role: {
      title: "Backend Engineer",
      seniority: "Senior",
      responsibilities: ["Build APIs"],
      requirements: [{ id: "r1", text: "5+ years with React", kind: "technical", priority: "must", origin: "generated", pinned: false }],
    },
    questions: [
      { id: "q1", requirement_ids: ["r1"], category: "technical", prompt: "?", answer_outline: "", difficulty: 2, origin: "generated", pinned: false },
    ],
    flashcards: [{ id: "f1", front: "?", back: "!", requirement_ids: ["r1"], origin: "generated", pinned: false }],
    schedule: { days_available: 1, days: [{ day: 1, focus: "Technical", question_ids: ["q1"], minutes: 25 }] },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  };
}

describe("validateKit", () => {
  it("accepts a well-formed kit", () => {
    expect(validateKit(validKit()).valid).toBe(true);
  });

  it("rejects a float minutes value", () => {
    const kit = validKit();
    kit.schedule.days[0]!.minutes = 25.5;
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  it("rejects a schedule question_id that does not reference a real question", () => {
    const kit = validKit();
    kit.schedule.days[0]!.question_ids = ["q-does-not-exist"];
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("Unknown question id"))).toBe(true);
  });

  it("rejects a question requirement_id that does not reference a real requirement", () => {
    const kit = validKit();
    kit.questions[0]!.requirement_ids = ["r-does-not-exist"];
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("Unknown requirement id"))).toBe(true);
  });

  it("rejects an invalid priority enum value", () => {
    const kit = validKit() as any;
    kit.role.requirements[0].priority = "important";
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  it("rejects a missing required field", () => {
    const kit = validKit() as any;
    delete kit.coverage.passes;
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });
});
