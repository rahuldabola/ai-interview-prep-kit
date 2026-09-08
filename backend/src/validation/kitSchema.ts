import { z } from "zod";

/**
 * Mirrors Appendix A exactly for the required fields. `origin`/`pinned` are additive
 * (Section 5 permits extending the structure where it genuinely helps) and are used to
 * drive the builder's edit/pin/regenerate behaviour (see README: "Generated / edited /
 * pinned state").
 */

const editableMeta = {
  origin: z.enum(["generated", "edited", "manual"]),
  pinned: z.boolean(),
};

export const requirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
  ...editableMeta,
});

export const questionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  prompt: z.string().min(1),
  answer_outline: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  ...editableMeta,
});

export const flashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string(),
  requirement_ids: z.array(z.string()),
  ...editableMeta,
});

export const scheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().nonnegative(),
});

export const kitSchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number().int().nonnegative(),
    researched_at: z.string(),
    pages_used: z.array(z.string()),
  }),
  company_brief: z.object({
    summary: z.string(),
    what_they_do: z.string(),
    hiring_process_notes: z.string(),
    sources: z.array(z.string()),
    ...editableMeta,
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(requirementSchema),
  }),
  questions: z.array(questionSchema),
  flashcards: z.array(flashcardSchema),
  schedule: z.object({
    days_available: z.number().int().positive(),
    days: z.array(scheduleDaySchema),
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()),
    passes: z.number().int().nonnegative(),
  }),
});

export type ValidatedKit = z.infer<typeof kitSchema>;

export interface KitValidationIssue {
  path: string;
  message: string;
}

/**
 * Structural validation (Appendix A field shape) PLUS the cross-reference invariants the
 * brief calls out explicitly: every schedule question_id must reference a real question,
 * and every question requirement_id must reference a real requirement.
 */
export function validateKit(kit: unknown): { valid: boolean; issues: KitValidationIssue[] } {
  const result = kitSchema.safeParse(kit);
  if (!result.success) {
    return {
      valid: false,
      issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }

  const issues: KitValidationIssue[] = [];
  const k = result.data;
  const requirementIds = new Set(k.role.requirements.map((r) => r.id));
  const questionIds = new Set(k.questions.map((q) => q.id));

  for (const q of k.questions) {
    for (const rid of q.requirement_ids) {
      if (!requirementIds.has(rid)) {
        issues.push({ path: `questions[${q.id}].requirement_ids`, message: `Unknown requirement id "${rid}"` });
      }
    }
  }
  for (const f of k.flashcards) {
    for (const rid of f.requirement_ids) {
      if (!requirementIds.has(rid)) {
        issues.push({ path: `flashcards[${f.id}].requirement_ids`, message: `Unknown requirement id "${rid}"` });
      }
    }
  }
  for (const day of k.schedule.days) {
    for (const qid of day.question_ids) {
      if (!questionIds.has(qid)) {
        issues.push({ path: `schedule.days[${day.day}].question_ids`, message: `Unknown question id "${qid}"` });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
