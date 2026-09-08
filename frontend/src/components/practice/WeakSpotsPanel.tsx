"use client";

import { useWeakSpots } from "@/lib/hooks/useWeakSpots";
import { Card, PriorityBadge } from "@/components/ui";

/**
 * Creative feature: a deterministic "weak spots" report combining requirement coverage
 * with recorded practice confidence — what to restudy, ranked, rather than a flat list of
 * everything (see README for why this was worth building).
 */
export function WeakSpotsPanel({ kitId }: { kitId: string }) {
  const { data, isLoading } = useWeakSpots(kitId);
  if (isLoading || !data) return null;

  const top = data.weak_spots.slice(0, 5);
  if (top.length === 0) return null;

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Weak spots</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ranked by what you haven&apos;t practised yet, then by lowest recorded confidence.
        </p>
      </div>
      <ul className="space-y-2">
        {top.map((spot) => (
          <li key={spot.requirement_id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
            <div className="min-w-0">
              <p className="truncate">{spot.text}</p>
              <div className="mt-1 flex items-center gap-2">
                <PriorityBadge priority={spot.priority} />
                <span className="text-xs text-slate-400">
                  {spot.status === "unpracticed" ? "Not practised yet" : `Avg confidence ${spot.avg_confidence?.toFixed(1)}/5`}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
