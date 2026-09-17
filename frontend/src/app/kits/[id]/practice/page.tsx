"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useKitDetail } from "@/lib/hooks/useKit";
import { usePracticeSession, useRecordAttempt } from "@/lib/hooks/usePractice";
import { Button, Card, EmptyState, ErrorBanner, Meter, Skeleton } from "@/components/ui";
import { WeakSpotsPanel } from "@/components/practice/WeakSpotsPanel";

const CONFIDENCE_OPTIONS = [
  { value: 1, label: "No idea", className: "hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950" },
  { value: 2, label: "Shaky", className: "hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950" },
  { value: 3, label: "OK", className: "hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950" },
  { value: 4, label: "Good", className: "hover:border-lime-500 hover:bg-lime-50 dark:hover:bg-lime-950" },
  { value: 5, label: "Nailed it", className: "hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950" },
] as const;

export default function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useRequireAuth();
  const kitQuery = useKitDetail(id);
  const sessionQuery = usePracticeSession(id);
  const recordAttempt = useRecordAttempt(id);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Ratings from this sitting, so the summary can report what just happened rather than
  // only the all-time averages the server keeps.
  const [sessionRatings, setSessionRatings] = useState<number[]>([]);

  const kit = kitQuery.data?.kit;
  const session = sessionQuery.data;

  const flashcardsById = new Map((kit?.flashcards ?? []).map((f) => [f.id, f]));
  const order = (session?.order ?? []).filter((cardId) => flashcardsById.has(cardId));
  const done = order.length > 0 && index >= order.length;
  const current = done || order.length === 0 ? null : flashcardsById.get(order[index]!);

  const onConfidence = useCallback(
    (confidence: 1 | 2 | 3 | 4 | 5) => {
      if (!current || recordAttempt.isPending) return;
      setSessionRatings((prev) => [...prev, confidence]);
      // Advance immediately rather than waiting on the round trip: the rating is already
      // recorded locally, and making the user wait for a POST between cards turns a quick
      // review into a stutter. A failed save surfaces as an error banner.
      setRevealed(false);
      setIndex((i) => i + 1);
      recordAttempt.mutate({ flashcard_id: current.id, confidence });
    },
    [current, recordAttempt]
  );

  function restart() {
    setIndex(0);
    setRevealed(false);
    setSessionRatings([]);
    sessionQuery.refetch();
  }

  // Keyboard shortcuts: a review session is a rhythm, and reaching for the mouse between
  // every card breaks it. Space reveals, 1-5 rate.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (!current) return;

      if (!revealed && (e.code === "Space" || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed && e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        onConfidence(Number(e.key) as 1 | 2 | 3 | 4 | 5);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [current, revealed, onConfidence]);

  if (kitQuery.isLoading || sessionQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (kitQuery.isError || sessionQuery.isError || !kit || !session) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <BackLink id={id} />
        <ErrorBanner
          message="Could not load this kit's practice session. It may still be generating."
          action={
            <Button variant="secondary" size="sm" onClick={() => sessionQuery.refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (kit.flashcards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <BackLink id={id} />
        <EmptyState
          title="No flashcards to practise"
          description="This kit has no flashcards yet. Add some in the builder, then come back."
          action={
            <Link href={`/kits/${id}`}>
              <Button>Open the builder</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const requirementText = new Map(kit.role.requirements.map((r) => [r.id, r.text]));
  const coveredCount = session.covered.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <BackLink id={id} />
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Practice</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Cards are ordered by what you know least — least-confident and never-seen first.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-ink-muted">
          <span>Cards practised at least once</span>
          <span>
            {coveredCount} / {session.totalCards}
          </span>
        </div>
        <Meter
          value={coveredCount}
          max={session.totalCards}
          label="Flashcards practised at least once"
          tone="emerald"
        />
      </div>

      {recordAttempt.isError && (
        <ErrorBanner message="Your last rating could not be saved. Your progress for this session is still shown, but it may not carry over." />
      )}

      {done ? (
        <div className="space-y-4">
          <SessionSummary count={order.length} ratings={sessionRatings} onRestart={restart} />
          <WeakSpotsPanel kitId={id} />
        </div>
      ) : (
        current && (
          <Card className="space-y-5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium uppercase tracking-wide text-ink-subtle">
                Card {index + 1} of {order.length}
              </span>
              {(() => {
                const labels = current.requirement_ids.map((rid) => requirementText.get(rid)).filter(Boolean);
                return labels.length > 0 ? (
                  <span className="max-w-[55%] truncate text-ink-subtle" title={labels.join("; ")}>
                    {labels.join(" · ")}
                  </span>
                ) : null;
              })()}
            </div>

            <p className="text-lg font-medium text-ink text-balance-pretty sm:text-xl">{current.front}</p>

            {revealed ? (
              <div className="animate-fade-up space-y-5">
                <div className="rounded-xl border border-line bg-surface-muted/60 p-4 text-sm text-ink text-balance-pretty">
                  {current.back || <span className="italic text-ink-subtle">This card has no answer written yet.</span>}
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-ink">How confident did you feel?</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {CONFIDENCE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onConfidence(option.value)}
                        className={`flex flex-col items-center gap-0.5 rounded-lg border border-line-strong bg-surface px-2 py-2.5 text-xs font-medium text-ink transition-colors ${option.className}`}
                      >
                        <span className="text-base font-semibold">{option.value}</span>
                        <span className="text-ink-muted">{option.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink-subtle">
                    Tip: press <Kbd>1</Kbd>–<Kbd>5</Kbd> to rate without reaching for the mouse.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button size="lg" onClick={() => setRevealed(true)} className="w-full">
                  Reveal answer
                </Button>
                <p className="text-center text-xs text-ink-subtle">
                  Or press <Kbd>Space</Kbd>
                </p>
              </div>
            )}
          </Card>
        )
      )}
    </div>
  );
}

function BackLink({ id }: { id: string }) {
  return (
    <Link
      href={`/kits/${id}`}
      className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path d="M11 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back to kit
    </Link>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-muted">
      {children}
    </kbd>
  );
}

/** Reports what this sitting actually looked like, not just that it ended. */
function SessionSummary({
  count,
  ratings,
  onRestart,
}: {
  count: number;
  ratings: number[];
  onRestart: () => void;
}) {
  const average = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  const shaky = ratings.filter((r) => r <= 2).length;

  return (
    <Card className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
          <path d="M5 13l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink">Session complete</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted text-balance-pretty">
          You worked through {count} card{count === 1 ? "" : "s"}
          {average !== null && ` at an average confidence of ${average.toFixed(1)}/5`}
          {shaky > 0 && `, with ${shaky} you found shaky`}. The next session will lead with whatever you rated lowest.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onRestart}>Practise again</Button>
      </div>
    </Card>
  );
}
