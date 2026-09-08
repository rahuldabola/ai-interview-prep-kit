import type { Flashcard, Question, Requirement } from "./types.js";

/**
 * Flashcards are a deterministic transform of already-validated questions/requirements,
 * not a fresh LLM call. This guarantees requirement_ids stay correctly linked (no chance of
 * the model inventing a card that doesn't map to a real requirement) and saves a round of
 * quota — a deliberate trade documented in the README.
 */
export function buildFlashcards(
  requirements: Requirement[],
  questions: Question[],
  makeId: () => string
): Flashcard[] {
  return requirements.map((req) => {
    const covering = questions
      .filter((q) => q.requirement_ids.includes(req.id))
      .sort((a, b) => a.difficulty - b.difficulty)[0];

    const front = covering ? covering.prompt : `Key point: ${req.text}`;
    const back = covering
      ? covering.answer_outline
      : "No generated question currently covers this requirement yet — add your own notes here.";

    return {
      id: makeId(),
      front,
      back,
      requirement_ids: [req.id],
      origin: "generated",
      pinned: false,
    };
  });
}
