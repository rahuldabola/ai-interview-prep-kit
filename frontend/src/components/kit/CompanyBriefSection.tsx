"use client";

import type { Kit } from "@/lib/types";
import { useEditCompanyBrief, useRegenerateSection } from "@/lib/hooks/useKit";
import { useToast } from "@/components/Toaster";
import { Button, OriginBadge } from "@/components/ui";
import { EditableField } from "./EditableField";
import { PinButton, RegenerationNotice, SectionCard } from "./SectionCard";

const FIELDS = [
  {
    key: "summary" as const,
    label: "Summary",
    help: "The short version — who they are and why it matters for this role.",
  },
  { key: "what_they_do" as const, label: "What they do", help: "Their product and market, from their own pages." },
  {
    key: "hiring_process_notes" as const,
    label: "How they interview",
    help: "Anything their site or public discussion says about their process. Empty means we found nothing — not that there is nothing.",
  },
];

export function CompanyBriefSection({ kitId, kit }: { kitId: string; kit: Kit }) {
  const edit = useEditCompanyBrief(kitId);
  const regenerate = useRegenerateSection(kitId);
  const { toast } = useToast();
  const brief = kit.company_brief;

  function onRegenerate() {
    regenerate.mutate(
      { section: "company_brief" },
      {
        onSuccess: (data) =>
          toast(data.applied ? "Company brief regenerated." : "Nothing to regenerate — the brief is pinned or edited.", data.applied ? "success" : "info"),
        onError: (err) => toast(err.message || "Could not regenerate the brief.", "error"),
      }
    );
  }

  return (
    <SectionCard
      title="Company brief"
      subtitle="Built only from pages we actually retrieved."
      actions={
        <>
          <OriginBadge origin={brief.origin} />
          <PinButton
            pinned={brief.pinned}
            onToggle={() => edit.mutate({ pinned: !brief.pinned })}
            what="the company brief"
          />
          <Button variant="secondary" size="sm" onClick={onRegenerate} loading={regenerate.isPending}>
            Regenerate
          </Button>
        </>
      }
    >
      {regenerate.isSuccess && <RegenerationNotice applied={regenerate.data.applied} />}

      {FIELDS.map((field) => (
        <div key={field.key}>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {field.label}
          </span>
          <EditableField
            ariaLabel={`${field.label} — company brief`}
            value={brief[field.key]}
            onSave={(v) => edit.mutate({ [field.key]: v })}
            multiline
            rows={field.key === "summary" ? 3 : 4}
            placeholder={field.help}
          />
          <p className="mt-1 text-xs text-ink-subtle">{field.help}</p>
        </div>
      ))}

      {brief.sources.length > 0 && (
        <div className="border-t border-line pt-3">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">Sources</span>
          <ul className="space-y-1">
            {brief.sources.map((source) => (
              <li key={source}>
                <a
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-xs text-brand underline-offset-2 hover:underline"
                >
                  {source}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
