import { SCHEDULE } from "../config/constants.js";
import type { Question, Requirement, ScheduleDay } from "./types.js";

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  "system-design": "System design",
  "company-fit": "Company fit",
};

function priorityScore(question: Question, mustIds: Set<string>): number {
  if (question.requirement_ids.some((id) => mustIds.has(id))) return 3;
  if (question.requirement_ids.length > 0) return 2;
  return 1;
}

function focusLabel(dayQuestions: Question[]): string {
  if (dayQuestions.length === 0) return "Review / buffer day";
  const categories = Array.from(new Set(dayQuestions.map((q) => CATEGORY_LABELS[q.category] ?? q.category)));
  return categories.join(" & ");
}

/**
 * Deterministic schedule allocator (Section 8 — "this is arithmetic and allocation, it
 * belongs in your code, not in a prompt"). All generated questions are sorted by
 * (must-coverage > nice-coverage > uncategorised) then by difficulty descending, and
 * distributed round-robin across exactly `days` buckets. Round-robin over a
 * priority-sorted list is what gives the monotonic front-loading the brief asks for:
 * day 1 always receives strictly higher-ranked material than day 2, day 2 than day 3, and
 * so on, because each day's Nth item is always earlier in the sorted list than the next
 * day's Nth item. A day with no assigned material (days_available exceeds the number of
 * questions, e.g. a 60-day request against a thin JD) is still emitted as an explicit
 * "Review / buffer day" with 0 minutes, never omitted — the schedule always has exactly
 * `days` entries.
 */
export function buildSchedule(
  requirements: Requirement[],
  questions: Question[],
  days: number
): { days_available: number; days: ScheduleDay[] } {
  const mustIds = new Set(requirements.filter((r) => r.priority === "must").map((r) => r.id));

  const sorted = [...questions].sort((a, b) => {
    const scoreDiff = priorityScore(b, mustIds) - priorityScore(a, mustIds);
    if (scoreDiff !== 0) return scoreDiff;
    return b.difficulty - a.difficulty;
  });

  const buckets: Question[][] = Array.from({ length: days }, () => []);
  sorted.forEach((q, i) => {
    buckets[i % days]!.push(q);
  });

  const scheduleDays: ScheduleDay[] = buckets.map((dayQuestions, i) => ({
    day: i + 1,
    focus: focusLabel(dayQuestions),
    question_ids: dayQuestions.map((q) => q.id),
    minutes: dayQuestions.reduce((sum, q) => sum + SCHEDULE.MINUTES_BY_DIFFICULTY[q.difficulty], 0),
  }));

  return { days_available: days, days: scheduleDays };
}

/**
 * Drops schedule references to questions that no longer exist and recomputes each day's
 * minutes from what remains. Needed whenever questions are removed outside of a full
 * `buildSchedule` recompute — a category regeneration or a manual delete — so the schedule
 * never ends up pointing at a question_id that doesn't exist (a structural validation
 * invariant), without discarding the rest of the day-by-day layout.
 */
export function pruneScheduleReferences(
  schedule: { days_available: number; days: ScheduleDay[] },
  questions: Question[]
): { days_available: number; days: ScheduleDay[] } {
  const validIds = new Set(questions.map((q) => q.id));
  const byId = new Map(questions.map((q) => [q.id, q]));
  return {
    days_available: schedule.days_available,
    days: schedule.days.map((day) => {
      const question_ids = day.question_ids.filter((id) => validIds.has(id));
      const minutes = question_ids.reduce((sum, id) => sum + SCHEDULE.MINUTES_BY_DIFFICULTY[byId.get(id)!.difficulty], 0);
      return { ...day, question_ids, minutes };
    }),
  };
}
