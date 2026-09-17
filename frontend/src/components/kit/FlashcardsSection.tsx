"use client";

import { useState } from "react";
import Link from "next/link";
import type { Kit } from "@/lib/types";
import { useAddFlashcard, useDeleteFlashcard, useEditFlashcard } from "@/lib/hooks/useKit";
import { useToast } from "@/components/Toaster";
import { Button, Field, IconButton, OriginBadge, inputClass } from "@/components/ui";
import { EditableField } from "./EditableField";
import { PinButton, SectionCard } from "./SectionCard";

export function FlashcardsSection({ kitId, kit }: { kitId: string; kit: Kit }) {
  const edit = useEditFlashcard(kitId);
  const del = useDeleteFlashcard(kitId);
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // Requirement text rather than the raw id, so it is clear what each card is testing.
  const requirementText = new Map(kit.role.requirements.map((r) => [r.id, r.text]));

  function onDelete(cardId: string) {
    del.mutate(
      { cardId },
      {
        onSuccess: () => {
          toast("Flashcard deleted.", "success");
          setConfirmingDelete(null);
        },
        onError: (err) => toast(err.message || "Could not delete that flashcard.", "error"),
      }
    );
  }

  return (
    <SectionCard
      title="Flashcards"
      count={kit.flashcards.length}
      subtitle="Derived from your validated questions, so every card links back to a real requirement."
      actions={
        <>
          <Button variant={adding ? "ghost" : "secondary"} size="sm" onClick={() => setAdding((a) => !a)}>
            {adding ? "Cancel" : "Add flashcard"}
          </Button>
          {kit.flashcards.length > 0 && (
            <Link href={`/kits/${kitId}/practice`}>
              <Button size="sm">Practise these</Button>
            </Link>
          )}
        </>
      }
    >
      {adding && <AddFlashcardForm kitId={kitId} kit={kit} onDone={() => setAdding(false)} />}

      {kit.flashcards.length === 0 ? (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink-muted">
          No flashcards yet. They are generated from the question bank — add a question, or add a card by hand.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {kit.flashcards.map((card) => {
            const labels = card.requirement_ids.map((id) => requirementText.get(id)).filter(Boolean);
            return (
              <li key={card.id} className="flex flex-col rounded-xl border border-line bg-surface-muted/30 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span
                    className="min-w-0 truncate text-xs text-ink-subtle"
                    title={labels.join("; ") || "Not linked to a specific requirement"}
                  >
                    {labels.length > 0 ? labels.join(" · ") : "General"}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <OriginBadge origin={card.origin} />
                    <PinButton
                      pinned={card.pinned}
                      onToggle={() => edit.mutate({ cardId: card.id, patch: { pinned: !card.pinned } })}
                      what="this flashcard"
                    />
                    {confirmingDelete === card.id ? (
                      <span className="flex items-center gap-1">
                        <Button variant="danger" size="sm" onClick={() => onDelete(card.id)} loading={del.isPending}>
                          Delete
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(null)}>
                          Keep
                        </Button>
                      </span>
                    ) : (
                      <IconButton
                        label="Delete this flashcard"
                        onClick={() => setConfirmingDelete(card.id)}
                        className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      >
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7}>
                          <path d="M4 6h12M8 6V4.5h4V6M6.5 6l.5 9.5h6l.5-9.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </IconButton>
                    )}
                  </div>
                </div>

                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">Front</span>
                <EditableField
                  ariaLabel="Flashcard front"
                  value={card.front}
                  onSave={(v) => edit.mutate({ cardId: card.id, patch: { front: v } })}
                  multiline
                  rows={2}
                />

                <span className="mb-1 mt-2.5 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                  Back
                </span>
                <EditableField
                  ariaLabel="Flashcard back"
                  value={card.back}
                  onSave={(v) => edit.mutate({ cardId: card.id, patch: { back: v } })}
                  multiline
                  rows={3}
                />
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function AddFlashcardForm({ kitId, kit, onDone }: { kitId: string; kit: Kit; onDone: () => void }) {
  const add = useAddFlashcard(kitId);
  const { toast } = useToast();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [requirementIds, setRequirementIds] = useState<string[]>([]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim()) return;
    add.mutate(
      { front: front.trim(), back: back.trim(), requirement_ids: requirementIds },
      {
        onSuccess: () => {
          toast("Flashcard added and pinned.", "success");
          onDone();
        },
        onError: (err) => toast(err.message || "Could not add that flashcard.", "error"),
      }
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-fade-up space-y-3 rounded-xl border border-dashed border-brand-ring bg-brand-soft/30 p-3.5"
    >
      <Field label="Front" htmlFor="new-card-front" hint="The prompt you want to be tested on.">
        <input
          id="new-card-front"
          required
          autoFocus
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="e.g. How does the Node event loop handle I/O?"
          className={inputClass}
        />
      </Field>

      <Field label="Back" htmlFor="new-card-back" hint="The answer you want to recall.">
        <textarea
          id="new-card-back"
          rows={2}
          value={back}
          onChange={(e) => setBack(e.target.value)}
          className={inputClass}
        />
      </Field>

      {kit.role.requirements.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Link to requirements (optional)
          </legend>
          <p className="mb-2 text-xs text-ink-subtle">
            Linked cards feed the weak-spots report, so it knows which requirement your answer reflects.
          </p>
          <div className="max-h-40 space-y-1.5 overflow-auto scrollbar-slim">
            {kit.role.requirements.map((req) => {
              const checked = requirementIds.includes(req.id);
              return (
                <label key={req.id} className="flex cursor-pointer items-start gap-2 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setRequirementIds((prev) =>
                        checked ? prev.filter((id) => id !== req.id) : [...prev, req.id]
                      )
                    }
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--brand)]"
                  />
                  <span className="text-balance-pretty">{req.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={add.isPending} disabled={!front.trim()}>
          Add flashcard
        </Button>
      </div>
    </form>
  );
}
