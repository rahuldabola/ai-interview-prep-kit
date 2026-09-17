"use client";

import { useId, useState } from "react";
import { Card, IconButton, PinIcon } from "@/components/ui";

/**
 * Shared shell for the builder's sections. A finished kit is long — brief, requirements,
 * four question categories, flashcards and a schedule — so each section collapses, letting
 * someone working on one part fold the rest out of the way instead of scrolling past it.
 */
export function SectionCard({
  title,
  subtitle,
  count,
  actions,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <Card as="section" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <IconButton
            label={open ? `Collapse ${title}` : `Expand ${title}`}
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((o) => !o)}
            className="mt-0.5"
          >
            <svg
              viewBox="0 0 20 20"
              className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M7.5 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconButton>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              {title}
              {typeof count === "number" && (
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted">
                  {count}
                </span>
              )}
            </h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-muted text-balance-pretty">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {/* Kept mounted but hidden, so collapsing a section never discards in-progress edits
          or the debounced save that is about to fire. */}
      <div id={bodyId} hidden={!open} className="space-y-4">
        {children}
      </div>
    </Card>
  );
}

/**
 * Pin control. Pinning is what protects an item from being replaced when its section is
 * regenerated, so the label spells that out rather than just saying "pin".
 */
export function PinButton({
  pinned,
  onToggle,
  what,
}: {
  pinned: boolean;
  onToggle: () => void;
  what: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={pinned ? `Unpin ${what}` : `Pin ${what} so regenerating keeps it`}
      title={pinned ? "Pinned — regenerating will keep this" : "Pin this so regenerating keeps it"}
      onClick={onToggle}
      className={`shrink-0 rounded-md p-1.5 transition-colors ${
        pinned ? "text-amber-500 hover:text-amber-600" : "text-ink-subtle/50 hover:bg-surface-muted hover:text-ink-muted"
      }`}
    >
      <PinIcon filled={pinned} />
    </button>
  );
}

/** Shown after a regeneration that deliberately changed nothing, so it never looks broken. */
export function RegenerationNotice({ applied }: { applied: boolean }) {
  if (applied) return null;
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
      Everything here is either edited, pinned, or written by you — so regenerating left it all untouched. Unpin an item
      (or revert an edit) if you want a fresh version of it.
    </p>
  );
}

export const selectClass =
  "rounded-md border border-line-strong bg-surface px-2 py-1 text-xs text-ink transition-colors hover:border-brand-ring focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-ring/40";
