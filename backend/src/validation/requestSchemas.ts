import { z } from "zod";
import { SCHEDULE } from "../config/constants.js";

export const pipelineInputSchema = z.object({
  jd: z.string().min(1, "Job description is required").max(20000),
  company_url: z.string().min(1, "Company website is required"),
  days: z.coerce.number().int().min(SCHEDULE.MIN_DAYS).max(SCHEDULE.MAX_DAYS),
});
export type PipelineInputDto = z.infer<typeof pipelineInputSchema>;

export const batchCaseSchema = z.object({
  id: z.string().min(1),
  jd: z.string().min(1),
  company_url: z.string().min(1),
  days: z.number().int().min(SCHEDULE.MIN_DAYS).max(SCHEDULE.MAX_DAYS),
});
export const batchCasesSchema = z.array(batchCaseSchema);

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createKitSchema = pipelineInputSchema;

export const regenerateSectionSchema = z.object({
  section: z.enum(["company_brief", "questions:technical", "questions:behavioural", "questions:system-design", "questions:company-fit", "schedule"]),
});

export const editRequirementSchema = z.object({
  text: z.string().min(1).optional(),
  kind: z.enum(["technical", "behavioural", "domain"]).optional(),
  priority: z.enum(["must", "nice"]).optional(),
  pinned: z.boolean().optional(),
});

export const editQuestionSchema = z.object({
  prompt: z.string().min(1).optional(),
  answer_outline: z.string().optional(),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  requirement_ids: z.array(z.string()).optional(),
  pinned: z.boolean().optional(),
});

export const editFlashcardSchema = z.object({
  front: z.string().min(1).optional(),
  back: z.string().optional(),
  requirement_ids: z.array(z.string()).optional(),
  pinned: z.boolean().optional(),
});

export const editCompanyBriefSchema = z.object({
  summary: z.string().min(1).optional(),
  what_they_do: z.string().optional(),
  hiring_process_notes: z.string().optional(),
  pinned: z.boolean().optional(),
});

export const addQuestionSchema = z.object({
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  prompt: z.string().min(1),
  answer_outline: z.string().default(""),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  requirement_ids: z.array(z.string()).default([]),
});

export const addFlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().default(""),
  requirement_ids: z.array(z.string()).default([]),
});

export const reorderQuestionsSchema = z.object({
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  order: z.array(z.string().min(1)),
});

export const practiceAttemptSchema = z.object({
  flashcard_id: z.string().min(1),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});
