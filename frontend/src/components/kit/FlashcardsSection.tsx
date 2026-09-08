"use client";

import { useState } from "react";
import type { Kit } from "@/lib/types";
import { useAddFlashcard, useDeleteFlashcard, useEditFlashcard } from "@/lib/hooks/useKit";
import { Button, Card, PinIcon, inputClass } from "@/components/ui";
import { EditableField } from "./EditableField";

export function FlashcardsSection({ kitId, kit }: { kitId: string; kit: Kit }) {
  const edit = useEditFlashcard(kitId);
  const del = useDeleteFlashcard(kitId);
  const [adding, setAdding] = useState(false);

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Flashcards <span className="text-sm font-normal text-slate-400">({kit.flashcards.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setAdding((a) => !a)}>
            {adding ? "Cancel" : "Add flashcard"}
          </Button>
          <a href={`/kits/${kitId}/practice`}>
            <Button>Practice</Button>
          </a>
        </div>
      </div>

      {adding && <AddFlashcardForm kitId={kitId} onDone={() => setAdding(false)} />}

      <ul className="grid gap-3 sm:grid-cols-2">
        {kit.flashcards.map((f) => (
          <li key={f.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">{f.requirement_ids.join(", ") || "General"}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-pressed={f.pinned}
                  aria-label={f.pinned ? "Unpin flashcard" : "Pin flashcard"}
                  onClick={() => edit.mutate({ cardId: f.id, patch: { pinned: !f.pinned } })}
                  className={`rounded p-1 ${f.pinned ? "text-amber-500" : "text-slate-300 hover:text-slate-500"}`}
                >
                  <PinIcon filled={f.pinned} />
                </button>
                <button
                  type="button"
                  aria-label="Delete flashcard"
                  onClick={() => del.mutate({ cardId: f.id })}
                  className="rounded p-1 text-slate-300 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            </div>
            <span className="mb-1 block text-xs text-slate-400">Front</span>
            <EditableField ariaLabel="Flashcard front" value={f.front} onSave={(v) => edit.mutate({ cardId: f.id, patch: { front: v } })} multiline />
            <span className="mb-1 mt-2 block text-xs text-slate-400">Back</span>
            <EditableField ariaLabel="Flashcard back" value={f.back} onSave={(v) => edit.mutate({ cardId: f.id, patch: { back: v } })} multiline />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AddFlashcardForm({ kitId, onDone }: { kitId: string; onDone: () => void }) {
  const add = useAddFlashcard(kitId);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim()) return;
    add.mutate({ front, back, requirement_ids: [] }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-md border border-dashed border-slate-300 p-3 dark:border-slate-700">
      <input aria-label="New flashcard front" required value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front" className={inputClass} />
      <input aria-label="New flashcard back" value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back" className={inputClass} />
      <Button type="submit" disabled={add.isPending}>
        Add
      </Button>
    </form>
  );
}
