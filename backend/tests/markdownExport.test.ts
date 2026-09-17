import { describe, expect, it } from "vitest";
import { exportFilename, kitToMarkdown } from "../src/export/markdown.js";
import type { Kit } from "../src/pipeline/types.js";

function baseKit(overrides: Partial<Kit> = {}): Kit {
  return {
    source: {
      company: "Acme Corp",
      company_url: "https://acme.test",
      role: "Senior Backend Engineer",
      location: "Remote",
      jd_chars: 1200,
      researched_at: "2026-09-18T00:00:00.000Z",
      pages_used: ["https://acme.test/careers"],
    },
    company_brief: {
      summary: "Acme builds widgets.",
      what_they_do: "Industrial widget automation.",
      hiring_process_notes: "Take-home, then a system design round.",
      sources: ["https://acme.test/careers"],
      origin: "generated",
      pinned: false,
    },
    role: {
      title: "Senior Backend Engineer",
      seniority: "senior",
      responsibilities: ["Own the billing service"],
      requirements: [
        { id: "r1", text: "Strong Node.js | TypeScript", kind: "technical", priority: "must", origin: "generated", pinned: false },
        { id: "r2", text: "Mentoring", kind: "behavioural", priority: "nice", origin: "generated", pinned: false },
      ],
    },
    questions: [
      {
        id: "q1",
        requirement_ids: ["r1"],
        category: "technical",
        prompt: "How do you avoid event-loop starvation?",
        answer_outline: "Talk about worker threads and chunking.",
        difficulty: 3,
        origin: "generated",
        pinned: false,
      },
      {
        id: "q2",
        requirement_ids: ["r2"],
        category: "behavioural",
        prompt: "Tell me about mentoring a junior engineer.",
        answer_outline: "Use STAR.",
        difficulty: 1,
        origin: "generated",
        pinned: false,
      },
    ],
    flashcards: [
      { id: "f1", front: "Event loop?", back: "Single-threaded task queue.", requirement_ids: ["r1"], origin: "generated", pinned: false },
    ],
    schedule: {
      days_available: 2,
      days: [
        { day: 1, focus: "Technical depth", question_ids: ["q1"], minutes: 40 },
        { day: 2, focus: "Review / buffer day", question_ids: [], minutes: 0 },
      ],
    },
    coverage: { uncovered_requirement_ids: ["r2"], passes: 2 },
    ...overrides,
  };
}

describe("kitToMarkdown", () => {
  it("includes every section of the kit", () => {
    const md = kitToMarkdown(baseKit());
    expect(md).toContain("# Interview prep: Senior Backend Engineer");
    expect(md).toContain("## Company brief");
    expect(md).toContain("## The role");
    expect(md).toContain("## Question bank");
    expect(md).toContain("## Flashcards");
    expect(md).toContain("## Study schedule");
  });

  it("renders questions grouped by category with human-readable difficulty", () => {
    const md = kitToMarkdown(baseKit());
    expect(md).toContain("### Technical (1)");
    expect(md).toContain("### Behavioural (1)");
    expect(md).toContain("_Difficulty: Hard_");
    expect(md).toContain("_Difficulty: Easy_");
  });

  it("reports coverage per requirement rather than hiding uncovered ones", () => {
    const md = kitToMarkdown(baseKit());
    // r1 is covered by q1, r2 is listed as uncovered in coverage.
    expect(md).toMatch(/\| r1 \|.*\| Yes \|/);
    expect(md).toMatch(/\| r2 \|.*\| No \|/);
  });

  it("escapes pipes so a requirement cannot break out of the table", () => {
    const md = kitToMarkdown(baseKit());
    expect(md).toContain("Strong Node.js \| TypeScript");
  });

  it("emits an explicit note for a day with no scheduled material", () => {
    const md = kitToMarkdown(baseKit());
    expect(md).toContain("### Day 2 — Review / buffer day (0 min)");
    expect(md).toContain("_Review / buffer day — no new material scheduled._");
  });

  it("survives an empty-ish kit without throwing", () => {
    const sparse = baseKit({
      company_brief: { summary: "", what_they_do: "", hiring_process_notes: "", sources: [], origin: "generated", pinned: false },
      questions: [],
      flashcards: [],
      role: { title: "", seniority: "", responsibilities: [], requirements: [] },
    });
    const md = kitToMarkdown(sparse);
    expect(md).toContain("_No summary available._");
    expect(md).toContain("# Interview prep: Untitled role");
  });
});

describe("exportFilename", () => {
  it("slugifies company and role into a safe filename", () => {
    expect(exportFilename(baseKit(), "md")).toBe("acme-corp-senior-backend-engineer-prep.md");
  });

  it("falls back to a generic name when there is nothing to slugify", () => {
    const kit = baseKit();
    kit.source.company = "";
    kit.role.title = "";
    expect(exportFilename(kit, "json")).toBe("interview-prep-kit-prep.json");
  });
});
