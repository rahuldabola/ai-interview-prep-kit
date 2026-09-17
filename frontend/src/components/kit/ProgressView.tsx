"use client";

import { useEffect, useState } from "react";
import type { ProgressEvent, SkippedSource } from "@/lib/types";
import { Button, Card, ErrorBanner, Meter, Spinner } from "@/components/ui";

/** The pipeline's steps in the order they run, so pending ones can be shown up front. */
const STEPS: { key: string; label: string; detail: string }[] = [
  {
    key: "extract_requirements",
    label: "Reading the job description",
    detail: "Pulling out the real requirements, and dropping anything not actually in the posting.",
  },
  {
    key: "crawl_company",
    label: "Crawling the company site",
    detail: "Looking for careers, about and handbook pages that describe how they work and hire.",
  },
  {
    key: "discussion_search",
    label: "Searching public discussion",
    detail: "Best-effort look for first-hand accounts of their interview process.",
  },
  { key: "company_brief", label: "Writing the company brief", detail: "Grounded only in the pages we actually read." },
  {
    key: "generate_questions",
    label: "Generating questions",
    detail: "Separate passes for technical, behavioural, system-design and company-fit.",
  },
  {
    key: "coverage_check",
    label: "Checking coverage",
    detail: "Every must-have requirement needs a question; gaps trigger a targeted second pass.",
  },
  { key: "schedule", label: "Building your schedule", detail: "Hardest, highest-priority material first." },
  { key: "validate", label: "Validating the kit", detail: "Structure and cross-references checked before saving." },
];

export function ProgressView({
  progress,
  skipped,
  error,
  onRetry,
  retrying,
}: {
  progress: ProgressEvent[];
  skipped: SkippedSource[];
  error: { code: string; message: string } | null;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const latestByStep = new Map<string, ProgressEvent>();
  for (const event of progress) latestByStep.set(event.step, event);

  const completed = STEPS.filter((step) => {
    const status = latestByStep.get(step.key)?.status;
    return status === "done" || status === "skipped";
  }).length;

  const failed = Boolean(error);

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {!failed && <Spinner className="h-5 w-5 text-brand" />}
            <div>
              <h2 className="text-base font-semibold text-ink">
                {failed ? "Generation failed" : "Building your kit…"}
              </h2>
              {!failed && <Elapsed />}
            </div>
          </div>
          <span className="text-sm text-ink-muted">
            {completed} of {STEPS.length} steps
          </span>
        </div>

        <Meter
          value={completed}
          max={STEPS.length}
          label="Generation progress"
          tone={failed ? "amber" : "brand"}
        />

        {/* aria-live so a screen-reader user hears each step land instead of watching a
            silent spinner. */}
        <ol className="space-y-3" aria-live="polite">
          {STEPS.map((step) => {
            const event = latestByStep.get(step.key);
            const status = event?.status;
            const pending = !event;
            return (
              <li key={step.key} className="flex items-start gap-3">
                <StepIcon status={status} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${pending ? "text-ink-subtle" : "text-ink"}`}>{step.label}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle text-balance-pretty">
                    {event?.message || step.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {!failed && (
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-muted">
            This usually takes one to two minutes. You can leave this page — generation continues on the server and the
            kit will be waiting on your dashboard.
          </p>
        )}
      </Card>

      {skipped.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Sources we could not use ({skipped.length})
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
            These are reported rather than guessed around — anything we could not read simply is not in the brief.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-200">
            {skipped.map((source, i) => (
              <li key={i} className="truncate">
                <span className="font-mono">{source.url}</span> — {source.reason}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {error && (
        <ErrorBanner
          message={error.message}
          action={
            onRetry && (
              <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
                Retry generation
              </Button>
            )
          }
        />
      )}
    </div>
  );
}

function StepIcon({ status }: { status?: ProgressEvent["status"] }) {
  const base = "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full";

  if (status === "done") {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`} aria-label="Done">
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M5 10.5l3.5 3.5L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300`} aria-label="Skipped">
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M6 10h8" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className={`${base} bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300`} aria-label="Failed">
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (status === "started") {
    return (
      <span className={`${base} bg-brand-soft text-brand`} aria-label="In progress">
        <Spinner className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className={`${base} border border-line-strong`} aria-label="Pending">
      <span className="h-1 w-1 rounded-full bg-line-strong" />
    </span>
  );
}

/**
 * A running clock is the cheapest possible reassurance that something is still happening —
 * a static spinner gives no sense of whether the app has hung.
 */
function Elapsed() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return (
    <p className="text-xs text-ink-subtle">
      {minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`} elapsed
    </p>
  );
}
