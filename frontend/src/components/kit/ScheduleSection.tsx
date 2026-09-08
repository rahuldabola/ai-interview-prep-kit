"use client";

import type { Kit } from "@/lib/types";
import { useRegenerateSection } from "@/lib/hooks/useKit";
import { Button, Card } from "@/components/ui";

export function ScheduleSection({ kitId, kit }: { kitId: string; kit: Kit }) {
  const regenerate = useRegenerateSection(kitId);
  const questionsById = new Map(kit.questions.map((q) => [q.id, q]));

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Study schedule <span className="text-sm font-normal text-slate-400">({kit.schedule.days_available} day(s))</span>
        </h2>
        <Button variant="secondary" disabled={regenerate.isPending} onClick={() => regenerate.mutate({ section: "schedule" })}>
          {regenerate.isPending ? "Recomputing..." : "Recompute from current questions"}
        </Button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Recomputing rebuilds every day from your current question bank; any day you rearranged by hand will be
        reset.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kit.schedule.days.map((day) => (
          <div key={day.day} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium">Day {day.day}</span>
              <span className="text-xs text-slate-400">{day.minutes} min</span>
            </div>
            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">{day.focus}</p>
            {day.question_ids.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No material scheduled — buffer/review day.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {day.question_ids.map((qid) => {
                  const q = questionsById.get(qid);
                  return (
                    <li key={qid} className="truncate" title={q?.prompt}>
                      · {q?.prompt ?? qid}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
