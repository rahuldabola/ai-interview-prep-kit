"use client";

import type { Kit, RequirementKind, RequirementPriority } from "@/lib/types";
import { useEditRequirement } from "@/lib/hooks/useKit";
import { OriginBadge, PriorityBadge } from "@/components/ui";
import { EditableField } from "./EditableField";
import { PinButton, SectionCard, selectClass } from "./SectionCard";

const KINDS: RequirementKind[] = ["technical", "behavioural", "domain"];
const PRIORITIES: RequirementPriority[] = ["must", "nice"];

const KIND_LABELS: Record<RequirementKind, string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  domain: "Domain",
};

export function RequirementsSection({ kitId, kit }: { kitId: string; kit: Kit }) {
  const edit = useEditRequirement(kitId);
  const uncovered = new Set(kit.coverage.uncovered_requirement_ids);
  const mustCount = kit.role.requirements.filter((r) => r.priority === "must").length;

  return (
    <SectionCard
      title="Role & requirements"
      count={kit.role.requirements.length}
      subtitle={[kit.role.title, kit.role.seniority].filter(Boolean).join(" · ") || undefined}
    >
      <p className="text-xs text-ink-subtle">
        {mustCount} must-have{mustCount === 1 ? "" : "s"}, {kit.role.requirements.length - mustCount} nice-to-have
        {kit.role.requirements.length - mustCount === 1 ? "" : "s"}. Extracted from the posting only — anything whose
        key terms were not in the text was dropped rather than invented.
      </p>

      {kit.role.responsibilities.length > 0 && (
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Responsibilities
          </span>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {kit.role.responsibilities.map((responsibility, i) => (
              <li key={i} className="text-balance-pretty">
                {responsibility}
              </li>
            ))}
          </ul>
        </div>
      )}

      {kit.role.requirements.length === 0 ? (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink-muted">
          No requirements could be extracted from this posting — it may be very short or mostly marketing copy.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {kit.role.requirements.map((req) => {
            const isUncovered = uncovered.has(req.id);
            return (
              <li
                key={req.id}
                className={`rounded-xl border p-3 transition-colors ${
                  isUncovered
                    ? "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/40"
                    : "border-line bg-surface-muted/30"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={req.priority} />
                    <OriginBadge origin={req.origin} />
                    {isUncovered && (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        No question covers this yet
                      </span>
                    )}
                  </div>
                  <PinButton
                    pinned={req.pinned}
                    onToggle={() => edit.mutate({ reqId: req.id, patch: { pinned: !req.pinned } })}
                    what="this requirement"
                  />
                </div>

                <EditableField
                  ariaLabel={`Requirement text for ${req.id}`}
                  value={req.text}
                  onSave={(v) => edit.mutate({ reqId: req.id, patch: { text: v } })}
                />

                <div className="mt-2 flex flex-wrap gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-ink-subtle">
                    Kind
                    <select
                      value={req.kind}
                      onChange={(e) => edit.mutate({ reqId: req.id, patch: { kind: e.target.value } })}
                      className={selectClass}
                    >
                      {KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {KIND_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-ink-subtle">
                    Priority
                    <select
                      value={req.priority}
                      onChange={(e) => edit.mutate({ reqId: req.id, patch: { priority: e.target.value } })}
                      className={selectClass}
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority === "must" ? "Must-have" : "Nice-to-have"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
