import { describe, expect, it } from "vitest";
import { computeWeakSpots } from "../src/pipeline/weakSpots.js";
import type { Kit } from "../src/pipeline/types.js";

function baseKit(): Kit {
  return {
    source: { company: "", company_url: "", role: "", location: "", jd_chars: 0, researched_at: "", pages_used: [] },
    company_brief: { summary: "", what_they_do: "", hiring_process_notes: "", sources: [], origin: "generated", pinned: false },
    role: {
      title: "",
      seniority: "",
      responsibilities: [],
      requirements: [
        { id: "r1", text: "React", kind: "technical", priority: "must", origin: "generated", pinned: false },
        { id: "r2", text: "Mentoring", kind: "behavioural", priority: "must", origin: "generated", pinned: false },
        { id: "r3", text: "Kubernetes", kind: "technical", priority: "nice", origin: "generated", pinned: false },
      ],
    },
    questions: [],
    flashcards: [
      { id: "f1", front: "", back: "", requirement_ids: ["r1"], origin: "generated", pinned: false },
      { id: "f2", front: "", back: "", requirement_ids: ["r2"], origin: "generated", pinned: false },
      { id: "f3", front: "", back: "", requirement_ids: ["r3"], origin: "generated", pinned: false },
    ],
    schedule: { days_available: 1, days: [] },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  };
}

describe("computeWeakSpots", () => {
  it("ranks an unpracticed requirement ahead of a low-but-known confidence one", () => {
    const kit = baseKit();
    // r1 practiced at a low confidence; r2 never practiced; r3 practiced high.
    const confidence = new Map([
      ["f1", 2],
      ["f3", 5],
    ]);
    const spots = computeWeakSpots(kit, confidence);
    expect(spots[0]!.requirement_id).toBe("r2");
    expect(spots[0]!.status).toBe("unpracticed");
  });

  it("sorts practiced requirements by ascending average confidence", () => {
    const kit = baseKit();
    const confidence = new Map([
      ["f1", 4],
      ["f2", 2],
      ["f3", 5],
    ]);
    const spots = computeWeakSpots(kit, confidence).filter((s) => s.status === "practiced");
    expect(spots.map((s) => s.requirement_id)).toEqual(["r2", "r1", "r3"]);
  });

  it("breaks unpracticed ties toward must-priority requirements", () => {
    const kit = baseKit();
    const spots = computeWeakSpots(kit, new Map());
    expect(spots.map((s) => s.requirement_id)).toEqual(["r1", "r2", "r3"]);
    expect(spots[spots.length - 1]!.priority).toBe("nice");
  });
});
