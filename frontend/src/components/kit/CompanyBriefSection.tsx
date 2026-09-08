"use client";

import type { Kit } from "@/lib/types";
import { useEditCompanyBrief, useRegenerateSection } from "@/lib/hooks/useKit";
import { Button, Card, PinIcon } from "@/components/ui";
import { EditableField } from "./EditableField";

export function CompanyBriefSection({ kitId, kit }: { kitId: string; kit: Kit }) {
  const edit = useEditCompanyBrief(kitId);
  const regenerate = useRegenerateSection(kitId);
  const brief = kit.company_brief;

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Company brief</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={brief.pinned}
            aria-label={brief.pinned ? "Unpin company brief" : "Pin company brief so it survives regeneration"}
            onClick={() => edit.mutate({ pinned: !brief.pinned })}
            className={`rounded p-1 ${brief.pinned ? "text-amber-500" : "text-slate-300 hover:text-slate-500"}`}
          >
            <PinIcon filled={brief.pinned} />
          </button>
          <Button
            variant="secondary"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate({ section: "company_brief" })}
          >
            {regenerate.isPending ? "Regenerating..." : "Regenerate"}
          </Button>
        </div>
      </div>

      {regenerate.isSuccess && !regenerate.data.applied && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          This brief has edits or is pinned, so regeneration left it unchanged.
        </p>
      )}

      <div>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Summary</span>
        <EditableField
          ariaLabel="Company brief summary"
          value={brief.summary}
          onSave={(v) => edit.mutate({ summary: v })}
          multiline
        />
      </div>
      <div>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">What they do</span>
        <EditableField
          ariaLabel="What the company does"
          value={brief.what_they_do}
          onSave={(v) => edit.mutate({ what_they_do: v })}
          multiline
        />
      </div>
      <div>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Hiring process notes</span>
        <EditableField
          ariaLabel="Hiring process notes"
          value={brief.hiring_process_notes}
          onSave={(v) => edit.mutate({ hiring_process_notes: v })}
          multiline
        />
      </div>
      {brief.sources.length > 0 && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Sources: {brief.sources.join(", ")}
        </div>
      )}
    </Card>
  );
}
