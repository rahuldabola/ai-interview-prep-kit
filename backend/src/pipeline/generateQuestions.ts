import { z } from "zod";
import { generateJson } from "../llm/geminiClient.js";
import { wrapUntrusted } from "../llm/promptSafety.js";
import type { Question, QuestionCategory, Requirement } from "./types.js";

const rawQuestionSchema = z.object({
  requirement_ids: z.array(z.string()).optional(),
  prompt: z.string().min(1),
  answer_outline: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const questionBatchSchema = z.object({ questions: z.array(rawQuestionSchema) });

interface RawQuestion {
  requirement_ids?: string[];
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
}

function buildQuestions(
  raw: RawQuestion[],
  category: QuestionCategory,
  validRequirementIds: Set<string>,
  makeId: () => string
): Question[] {
  return raw.map((q) => ({
    id: makeId(),
    requirement_ids: (q.requirement_ids ?? []).filter((id) => validRequirementIds.has(id)),
    category,
    prompt: q.prompt,
    answer_outline: q.answer_outline,
    difficulty: q.difficulty,
    origin: "generated",
    pinned: false,
  }));
}

const TECHNICAL_SYSTEM = `You write interview questions that test specific technical or domain
requirements from a job description. Each question must reference the exact requirement id(s)
it tests. Questions should be concrete and answerable in a live interview (not essay prompts),
with a short answer outline covering the key points a strong answer would hit.`;

const BEHAVIOURAL_SYSTEM = `You write behavioural interview questions ("tell me about a time...",
situational judgement) that probe specific soft-skill or leadership requirements from a job
description — for example "mentors junior engineers" should produce a behavioural question
about mentoring, not a technical one. Each question must reference the exact requirement id(s)
it tests.`;

const SYSTEM_DESIGN_SYSTEM = `You write system-design interview questions appropriate for the
seniority and hiring process of a specific role. If the company's known hiring process
includes a system-design round, lean into that; if it explicitly does not, still include one
or two general-fit design questions but keep them lighter. Return an empty questions array if
system design is clearly not relevant to this role's seniority (e.g. an entry-level or
non-engineering role).`;

const COMPANY_FIT_SYSTEM = `You write "why this company" / culture-fit interview questions
grounded in the specific company brief provided. Do not write generic questions that could
apply to any company — reference what is actually known about this company.`;

function requirementBlock(requirements: Requirement[]): string {
  return requirements.map((r) => `- ${r.id} [${r.priority}]: ${r.text}`).join("\n");
}

async function callQuestionBatch(
  system: string,
  userPrompt: string,
  category: QuestionCategory,
  validRequirementIds: Set<string>,
  makeId: () => string
): Promise<Question[]> {
  const result = await generateJson({
    system,
    prompt: `${userPrompt}\n\nReturn JSON: { "questions": [ { requirement_ids, prompt, answer_outline, difficulty (1-3) } ] }`,
    schema: questionBatchSchema,
  });
  return buildQuestions(result.questions, category, validRequirementIds, makeId);
}

export async function generateTechnicalQuestions(
  requirements: Requirement[],
  allValidIds: Set<string>,
  makeId: () => string
): Promise<Question[]> {
  const technicalReqs = requirements.filter((r) => r.kind === "technical" || r.kind === "domain");
  if (technicalReqs.length === 0) return [];
  return callQuestionBatch(
    TECHNICAL_SYSTEM,
    `Write one or two technical/domain interview questions for EACH of these requirements:\n${requirementBlock(technicalReqs)}`,
    "technical",
    allValidIds,
    makeId
  );
}

export async function generateBehaviouralQuestions(
  requirements: Requirement[],
  allValidIds: Set<string>,
  makeId: () => string
): Promise<Question[]> {
  const behaviouralReqs = requirements.filter((r) => r.kind === "behavioural");
  if (behaviouralReqs.length === 0) return [];
  return callQuestionBatch(
    BEHAVIOURAL_SYSTEM,
    `Write one or two behavioural interview questions for EACH of these requirements:\n${requirementBlock(behaviouralReqs)}`,
    "behavioural",
    allValidIds,
    makeId
  );
}

/**
 * Generates technical/domain questions and behavioural questions in separate calls with
 * separate instruction sets (Section 3: "a requirement like five years of React leads to
 * technical questions while mentoring junior engineers leads to behavioural ones; the two
 * should not come from the same call with the same instructions").
 */
export async function generateRequirementQuestions(
  requirements: Requirement[],
  allValidIds: Set<string>,
  makeId: () => string
): Promise<Question[]> {
  const [technical, behavioural] = await Promise.all([
    generateTechnicalQuestions(requirements, allValidIds, makeId),
    generateBehaviouralQuestions(requirements, allValidIds, makeId),
  ]);
  return [...technical, ...behavioural];
}

export async function generateSystemDesignQuestions(
  roleTitle: string,
  seniority: string,
  hiringProcessNotes: string,
  allValidIds: Set<string>,
  makeId: () => string
): Promise<Question[]> {
  const prompt = [
    `Role: ${roleTitle} (${seniority || "seniority unspecified"})`,
    wrapUntrusted("hiring_process_notes", hiringProcessNotes),
    "Write 0-3 system-design interview questions appropriate for this role.",
  ].join("\n");
  return callQuestionBatch(SYSTEM_DESIGN_SYSTEM, prompt, "system-design", allValidIds, makeId);
}

export async function generateCompanyFitQuestions(
  roleTitle: string,
  companySummary: string,
  allValidIds: Set<string>,
  makeId: () => string
): Promise<Question[]> {
  const prompt = [
    `Role: ${roleTitle}`,
    wrapUntrusted("company_brief", companySummary),
    "Write 2-3 company-fit interview questions grounded in this brief.",
  ].join("\n");
  return callQuestionBatch(COMPANY_FIT_SYSTEM, prompt, "company-fit", allValidIds, makeId);
}

/** Targeted regeneration for a specific set of still-uncovered requirements (the second pass). */
export async function generateTargetedQuestions(
  requirements: Requirement[],
  allValidIds: Set<string>,
  makeId: () => string
): Promise<Question[]> {
  return generateRequirementQuestions(requirements, allValidIds, makeId);
}
