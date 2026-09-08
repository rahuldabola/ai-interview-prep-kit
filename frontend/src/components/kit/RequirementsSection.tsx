"use client";

import type { Kit, RequirementKind, RequirementPriority } from "@/lib/types";
import { useEditRequirement } from "@/lib/hooks/useKit";
import { Card, PinIcon, PriorityBadge } from "@/components/ui";
import { EditableField } from "./EditableField";

const KINDS: RequirementKind[] = ["technical", "behavioural", "domain"];
const PRIORITIES: RequirementPriority[] = ["must", "nice"];

export function RequirementsSection({ kitId, kit }: { kitId: string; kit: Kit }) {
  const edit = useEditRequirement(kitId);
  const uncovered = new Set(kit.coverage.uncovered_requirement_ids);

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Role & requirements</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {kit.role.title || "Untitled role"} {kit.role.seniority && `· ${kit.role.seniority}`}
        </p>
      </div>

      {kit.role.responsibilities.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          {kit.role.responsibilities.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}

      <ul className="space-y-2">
        {kit.role.requirements.map((req) => (
          <li
            key={req.id}
            className={`rounded-md border p-3 ${
              uncovered.has(req.id)
                ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PriorityBadge priority={req.priority} />
                {uncovered.has(req.id) && (
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">No question covers this yet</span>
                )}
              </div>
              <button
                type="button"
                aria-pressed={req.pinned}
                aria-label={req.pinned ? "Unpin requirement" : "Pin requirement"}
                onClick={() => edit.mutate({ reqId: req.id, patch: { pinned: !req.pinned } })}
                className={`rounded p-1 ${req.pinned ? "text-amber-500" : "text-slate-300 hover:text-slate-500"}`}
              >
                <PinIcon filled={req.pinned} />
              </button>
            </div>
            <EditableField
              ariaLabel={`Requirement text for ${req.id}`}
              value={req.text}
              onSave={(v) => edit.mutate({ reqId: req.id, patch: { text: v } })}
            />
            <div className="mt-2 flex gap-3 text-sm">
              <label className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">Kind</span>
                <select
                  value={req.kind}
                  onChange={(e) => edit.mutate({ reqId: req.id, patch: { kind: e.target.value } })}
                  className="rounded border border-slate-300 bg-white px-1 py-0.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">Priority</span>
                <select
                  value={req.priority}
                  onChange={(e) => edit.mutate({ reqId: req.id, patch: { priority: e.target.value } })}
                  className="rounded border border-slate-300 bg-white px-1 py-0.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
