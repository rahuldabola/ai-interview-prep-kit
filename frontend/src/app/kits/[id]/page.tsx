"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useKitDetail } from "@/lib/hooks/useKit";
import { useRetryKit } from "@/lib/hooks/useKits";
import { useToast } from "@/components/Toaster";
import { downloadFile } from "@/lib/apiClient";
import { Button, Card, ErrorBanner, InfoBanner, Meter, Skeleton, StatusBadge } from "@/components/ui";
import { ProgressView } from "@/components/kit/ProgressView";
import { CompanyBriefSection } from "@/components/kit/CompanyBriefSection";
import { RequirementsSection } from "@/components/kit/RequirementsSection";
import { QuestionsSection } from "@/components/kit/QuestionsSection";
import { FlashcardsSection } from "@/components/kit/FlashcardsSection";
import { ScheduleSection } from "@/components/kit/ScheduleSection";

export default function KitBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useRequireAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useKitDetail(id);
  const retryKit = useRetryKit();
  const { toast } = useToast();
  const [exporting, setExporting] = useState<"md" | "json" | null>(null);

  function onRetry() {
    retryKit.mutate(
      { id },
      {
        onSuccess: () => toast("Generation restarted.", "success"),
        onError: (err) => toast(err.message || "Could not restart generation.", "error"),
      }
    );
  }

  async function onExport(format: "md" | "json") {
    setExporting(format);
    try {
      await downloadFile(`/api/kits/${id}/export?format=${format}`, `interview-prep-kit.${format}`);
      toast(`Downloaded as ${format === "md" ? "Markdown" : "JSON"}.`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not export this kit.", "error");
    } finally {
      setExporting(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorBanner
          message={
            (error as Error)?.message ||
            "Could not load this kit. It may not exist, or you may not have access to it."
          }
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const isBuilding = data.status === "draft" || data.status === "generating";
  const kit = data.kit;
  const title = kit?.role.title || firstLine(data.input.jd) || "Untitled role";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <BackLink />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-ink text-balance-pretty">{title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              {kit?.source.company && <span className="font-medium">{kit.source.company}</span>}
              <a
                href={data.input.company_url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-brand underline-offset-2 hover:underline"
              >
                {data.input.company_url}
              </a>
              <span aria-hidden="true">·</span>
              <span>{data.input.days}-day plan</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={data.status} />
            {data.status === "ready" && (
              <>
                <Link href={`/kits/${id}/practice`}>
                  <Button>Practise</Button>
                </Link>
                <Button variant="secondary" onClick={() => onExport("md")} loading={exporting === "md"}>
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExport("json")}
                  loading={exporting === "json"}
                  title="Download the raw kit data as JSON"
                >
                  JSON
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {(isBuilding || data.status === "failed") && (
        <ProgressView
          progress={data.progress}
          skipped={data.skipped}
          error={data.error}
          onRetry={data.status === "failed" ? onRetry : undefined}
          retrying={retryKit.isPending}
        />
      )}

      {data.status === "ready" && kit && (
        <div className="space-y-5">
          <CoverageSummary kit={kit} />

          {data.skipped.length > 0 && (
            <InfoBanner tone="warning">
              <p className="font-medium">
                {data.skipped.length} source{data.skipped.length === 1 ? "" : "s"} could not be read
              </p>
              <p className="mt-1 text-xs">
                The brief only reflects pages we actually retrieved — nothing here was filled in from guesswork.
              </p>
            </InfoBanner>
          )}

          <CompanyBriefSection kitId={id} kit={kit} />
          <RequirementsSection kitId={id} kit={kit} />
          <QuestionsSection kitId={id} kit={kit} />
          <FlashcardsSection kitId={id} kit={kit} />
          <ScheduleSection kitId={id} kit={kit} />
        </div>
      )}
    </div>
  );
}

/** A JD's first non-empty line is usually the job title — a better placeholder than a slice. */
function firstLine(jd: string): string {
  const line = jd
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return line ? line.slice(0, 90) : "";
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path d="M11 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      My kits
    </Link>
  );
}

/**
 * Surfaces the coverage numbers the pipeline already computed. Previously only the failure
 * case was shown (a warning banner when something was uncovered), so a fully-covered kit
 * gave the user no signal that the check had happened at all.
 */
function CoverageSummary({ kit }: { kit: NonNullable<import("@/lib/types").KitDetail["kit"]> }) {
  const total = kit.role.requirements.length;
  const uncovered = kit.coverage.uncovered_requirement_ids.length;
  const covered = total - uncovered;
  const uncoveredTexts = kit.role.requirements
    .filter((r) => kit.coverage.uncovered_requirement_ids.includes(r.id))
    .map((r) => r.text);

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Requirement coverage</h2>
        <span className="text-sm text-ink-muted">
          {covered} of {total} covered
          <span className="text-ink-subtle">
            {" "}
            · {kit.coverage.passes} pass{kit.coverage.passes === 1 ? "" : "es"}
          </span>
        </span>
      </div>

      <Meter
        value={covered}
        max={total}
        label="Requirements covered by at least one question"
        tone={uncovered === 0 ? "emerald" : "amber"}
      />

      {uncovered === 0 ? (
        <p className="text-xs text-ink-muted">
          Every requirement extracted from the posting has at least one question behind it.
        </p>
      ) : (
        <div className="text-xs text-ink-muted">
          <p className="text-balance-pretty">
            {uncovered} requirement{uncovered === 1 ? "" : "s"} still {uncovered === 1 ? "has" : "have"} no covering
            question after {kit.coverage.passes} pass{kit.coverage.passes === 1 ? "" : "es"}. Rather than invent
            questions for {uncovered === 1 ? "it" : "them"}, they are listed honestly — add a question by hand, or
            regenerate the relevant category.
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            {uncoveredTexts.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
