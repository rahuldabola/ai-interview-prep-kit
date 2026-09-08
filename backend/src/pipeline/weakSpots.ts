import type { Kit } from "./types.js";

export interface WeakSpot {
  requirement_id: string;
  text: string;
  priority: "must" | "nice";
  kind: string;
  status: "unpracticed" | "practiced";
  avg_confidence: number | null;
  flashcard_ids: string[];
  question_ids: string[];
}

/**
 * Creative feature: a "weak spots" report (Section: Creativity Requirement examples this
 * explicitly). Deterministic aggregation, not a fresh LLM call — reuses data the app
 * already has (requirement coverage + recorded practice confidence) rather than generating
 * anything new, so it's cheap, instant, and free of hallucination risk.
 *
 * Ranking: a requirement with no practiced flashcard yet is treated as higher-risk than one
 * with a low-but-known confidence (you don't know what you don't know), then ascending
 * average confidence, then must-priority before nice-to-have as a tiebreak.
 */
export function computeWeakSpots(kit: Kit, latestConfidenceByCard: Map<string, number>): WeakSpot[] {
  const spots: WeakSpot[] = kit.role.requirements.map((req) => {
    const flashcards = kit.flashcards.filter((f) => f.requirement_ids.includes(req.id));
    const questions = kit.questions.filter((q) => q.requirement_ids.includes(req.id));
    const confidences = flashcards.map((f) => latestConfidenceByCard.get(f.id)).filter((c): c is number => c !== undefined);

    const avg = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null;

    return {
      requirement_id: req.id,
      text: req.text,
      priority: req.priority,
      kind: req.kind,
      status: avg === null ? "unpracticed" : "practiced",
      avg_confidence: avg,
      flashcard_ids: flashcards.map((f) => f.id),
      question_ids: questions.map((q) => q.id),
    };
  });

  return spots.sort((a, b) => {
    if (a.status !== b.status) return a.status === "unpracticed" ? -1 : 1;
    if (a.avg_confidence !== null && b.avg_confidence !== null && a.avg_confidence !== b.avg_confidence) {
      return a.avg_confidence - b.avg_confidence;
    }
    if (a.priority !== b.priority) return a.priority === "must" ? -1 : 1;
    return 0;
  });
}
