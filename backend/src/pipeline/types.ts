/**
 * Kit structure per Appendix A of the brief. Field names required by the spec are kept
 * exact; `origin` and `pinned` are additive fields used to represent generated/edited/manual
 * state (Section 6 — the builder must not clobber user edits on regeneration).
 */

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
    /** Additive: what, if anything, was found about how this company interviews. */
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

/** A page successfully retrieved and cleaned during crawling. */
export interface RetrievedPage {
  url: string;
  title: string;
  text: string;
}

/** A source that could not be retrieved — recorded, never treated as a fatal error. */
export interface SkippedSource {
  url: string;
  reason: string;
}

export interface DiscussionSnippet {
  source: string;
  url: string;
  snippet: string;
}

export interface ProgressEvent {
  step: string;
  status: "started" | "done" | "skipped" | "error";
  message: string;
  at: string;
}

export interface PipelineInput {
  jd: string;
  company_url: string;
  days: number;
}

export interface PipelineResult {
  kit: Kit;
  skipped: SkippedSource[];
}
