"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useKitDetail } from "@/lib/hooks/useKit";
import { usePracticeSession, useRecordAttempt } from "@/lib/hooks/usePractice";
import { Button, Card, Spinner } from "@/components/ui";

const CONFIDENCE_LABELS = ["No idea", "Shaky", "OK", "Good", "Nailed it"];

export default function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useRequireAuth();
  const kitQuery = useKitDetail(id);
  const sessionQuery = usePracticeSession(id);
  const recordAttempt = useRecordAttempt(id);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (kitQuery.isLoading || sessionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Spinner className="mr-2 h-5 w-5" /> Loading practice session...
      </div>
    );
  }

  const kit = kitQuery.data?.kit;
  const session = sessionQuery.data;

  if (!kit || !session) {
    return <p className="text-sm text-red-600">Could not load this kit&apos;s practice session.</p>;
  }

  if (kit.flashcards.length === 0) {
    return <p className="text-sm text-slate-500">This kit has no flashcards yet — add some in the builder first.</p>;
  }

  const flashcardsById = new Map(kit.flashcards.map((f) => [f.id, f]));
  const order = session.order.filter((cardId) => flashcardsById.has(cardId));
  const done = index >= order.length;
  const current = done ? null : flashcardsById.get(order[index]!);
  const coveredCount = session.covered.length;

  function onConfidence(confidence: 1 | 2 | 3 | 4 | 5) {
    if (!current) return;
    recordAttempt.mutate(
      { flashcard_id: current.id, confidence },
      {
        onSuccess: () => {
          setRevealed(false);
          setIndex((i) => i + 1);
        },
      }
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href={`/kits/${id}`} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          ← Back to kit
        </Link>
        <h1 className="text-xl font-semibold">Practice</h1>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Covered</span>
          <span>
            {coveredCount} / {session.totalCards}
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-2 rounded-full bg-emerald-500 transition-all"
            style={{ width: `${session.totalCards ? (coveredCount / session.totalCards) * 100 : 0}%` }}
          />
        </div>
      </div>

      {done ? (
        <Card className="space-y-3 text-center">
          <h2 className="text-lg font-semibold">Session complete</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You went through {order.length} card(s). The next session will lead with whatever you felt least
            confident about.
          </p>
          <Button
            onClick={() => {
              setIndex(0);
              setRevealed(false);
              sessionQuery.refetch();
            }}
          >
            Practise again
          </Button>
        </Card>
      ) : (
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Card {index + 1} of {order.length}
          </p>
          <p className="text-lg font-medium">{current?.front}</p>
          {revealed ? (
            <>
              <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800">{current?.back}</div>
              <div>
                <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">How confident did you feel?</p>
                <div className="flex flex-wrap gap-2">
                  {([1, 2, 3, 4, 5] as const).map((c) => (
                    <Button key={c} variant="secondary" disabled={recordAttempt.isPending} onClick={() => onConfidence(c)}>
                      {c} · {CONFIDENCE_LABELS[c - 1]}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Button onClick={() => setRevealed(true)}>Reveal answer</Button>
          )}
        </Card>
      )}
    </div>
  );
}
