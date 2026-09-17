"use client";

import type { Kit } from "@/lib/types";
import { useRegenerateSection } from "@/lib/hooks/useKit";
import { useToast } from "@/components/Toaster";
import { Button, DifficultyBadge } from "@/components/ui";
import { SectionCard } from "./SectionCard";

export function ScheduleSection({ kitId, kit }: { kitId: string; kit: Kit }) {
  const regenerate = useRegenerateSection(kitId);
  const { toast } = useToast();
  const questionsById = new Map(kit.questions.map((q) => [q.id, q]));

  const totalMinutes = kit.schedule.days.reduce((sum, day) => sum + day.minutes, 0);
  const activeDays = kit.schedule.days.filter((day) => day.question_ids.length > 0).length;

  function onRecompute() {
    regenerate.mutate(
      { section: "schedule" },
      {
        onSuccess: () => toast("Schedule rebuilt from your current questions.", "success"),
        onError: (err) => toast(err.message || "Could not rebuild the schedule.", "error"),
      }
    );
  }

  return (
    <SectionCard
      title="Study schedule"
      count={kit.schedule.days_available}
      subtitle={`${formatMinutes(totalMinutes)} of material across ${activeDays} active day${
        activeDays === 1 ? "" : "s"
      }. Hardest, highest-priority work comes first.`}
      actions={
        <Button variant="secondary" size="sm" onClick={onRecompute} loading={regenerate.isPending}>
          Rebuild
        </Button>
      }
    >
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-muted">
        Rebuilding recomputes every day from your current question bank — it is pure arithmetic over the questions, so
        any day you rearranged by hand will be reset.
      </p>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kit.schedule.days.map((day) => {
          const empty = day.question_ids.length === 0;
          return (
            <li
              key={day.day}
              className={`flex flex-col rounded-xl border p-3 ${
                empty ? "border-dashed border-line-strong bg-surface-muted/20" : "border-line bg-surface-muted/30"
              }`}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="font-semibold text-ink">Day {day.day}</span>
                <span className="shrink-0 text-xs font-medium text-ink-subtle">
                  {day.minutes > 0 ? formatMinutes(day.minutes) : "—"}
                </span>
              </div>
              <p className="mb-2 text-sm text-ink-muted text-balance-pretty">{day.focus}</p>

              {empty ? (
                <p className="text-xs italic text-ink-subtle">
                  Buffer day — nothing new scheduled. Use it to revisit whatever felt weakest.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {day.question_ids.map((qid) => {
                    const question = questionsById.get(qid);
                    return (
                      <li key={qid} className="flex items-start gap-1.5 text-xs text-ink-muted">
                        {question && <DifficultyBadge difficulty={question.difficulty} />}
                        <span className="min-w-0 flex-1 text-balance-pretty" title={question?.prompt}>
                          {question?.prompt ?? qid}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

/** "1h 25m" reads faster than "85 min" once a day's budget passes an hour. */
function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}
