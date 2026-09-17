"use client";

import { useWeakSpots } from "@/lib/hooks/useWeakSpots";
import { Card, Meter, PriorityBadge, Skeleton } from "@/components/ui";

/**
 * Creative feature: a deterministic "weak spots" report combining requirement coverage
 * with recorded practice confidence — what to restudy, ranked, rather than a flat list of
 * everything (see README for why this was worth building).
 */
export function WeakSpotsPanel({ kitId }: { kitId: string }) {
  const { data, isLoading, isError } = useWeakSpots(kitId);

  if (isLoading) {
    return (
      <Card className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
      </Card>
    );
  }

  // A failed side-panel should never be the loudest thing on a "well done" screen.
  if (isError || !data) return null;

  const top = data.weak_spots.slice(0, 5);
  if (top.length === 0) return null;

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ink">What to study next</h2>
        <p className="mt-1 text-sm text-ink-muted text-balance-pretty">
          Ranked by what you have not practised yet, then by lowest confidence. Computed from your own answers — nothing
          here is guessed.
        </p>
      </div>

      <ol className="space-y-2.5">
        {top.map((spot, i) => (
          <li key={spot.requirement_id} className="rounded-xl border border-line bg-surface-muted/30 p-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink text-balance-pretty">{spot.text}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={spot.priority} />
                  {spot.status === "unpracticed" ? (
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Not practised yet</span>
                  ) : (
                    <span className="text-xs text-ink-subtle">
                      Confidence {spot.avg_confidence?.toFixed(1)} / 5
                    </span>
                  )}
                  <span className="text-xs text-ink-subtle">
                    {spot.flashcard_ids.length} card{spot.flashcard_ids.length === 1 ? "" : "s"} ·{" "}
                    {spot.question_ids.length} question{spot.question_ids.length === 1 ? "" : "s"}
                  </span>
                </div>
                {spot.status === "practiced" && spot.avg_confidence !== null && (
                  <div className="mt-2">
                    <Meter
                      value={spot.avg_confidence}
                      max={5}
                      label={`Confidence for ${spot.text}`}
                      tone={spot.avg_confidence >= 4 ? "emerald" : spot.avg_confidence >= 3 ? "amber" : "brand"}
                    />
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
