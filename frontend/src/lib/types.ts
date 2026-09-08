// Mirrors backend/src/pipeline/types.ts (Appendix A + additive origin/pinned state).
// Kept as a hand-written mirror rather than a shared package to keep the two deployable
// halves (Vercel frontend, Render backend) independently buildable.

export type RequirementKind = "technical" | "behavioural" | "domain";
export type RequirementPriority = "must" | "nice";
export type QuestionCategory = "technical" | "behavioural" | "system-design" | "company-fit";
export type ItemOrigin = "generated" | "edited" | "manual";

export interface EditableMeta {
  origin: ItemOrigin;
  pinned: boolean;
}

export interface Requirement extends EditableMeta {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export interface Question extends EditableMeta {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
}

export interface Flashcard extends EditableMeta {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Kit {
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };
  company_brief: EditableMeta & {
    summary: string;
    what_they_do: string;
    hiring_process_notes: string;
    sources: string[];
  };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Requirement[];
  };
  questions: Question[];
  flashcards: Flashcard[];
  schedule: {
    days_available: number;
    days: ScheduleDay[];
  };
  coverage: {
    uncovered_requirement_ids: string[];
    passes: number;
  };
}

export type KitStatus = "draft" | "generating" | "ready" | "failed";

export interface ProgressEvent {
  step: string;
  status: "started" | "done" | "skipped" | "error";
  message: string;
  at: string;
}

export interface SkippedSource {
  url: string;
  reason: string;
}

export interface KitListItem {
  id: string;
  status: KitStatus;
  input: { jd: string; company_url: string; days: number };
  source: Kit["source"] | null;
  error: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface KitDetail {
  id: string;
  status: KitStatus;
  input: { jd: string; company_url: string; days: number };
  kit: Kit | null;
  progress: ProgressEvent[];
  skipped: SkippedSource[];
  error: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
}
