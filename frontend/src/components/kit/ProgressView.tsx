import type { ProgressEvent, SkippedSource } from "@/lib/types";
import { Card, ErrorBanner, Spinner } from "@/components/ui";

const STEP_LABELS: Record<string, string> = {
  extract_requirements: "Extracting requirements from the job description",
  crawl_company: "Crawling the company site",
  discussion_search: "Searching for public interview discussion",
  company_brief: "Writing the company brief",
  generate_questions: "Generating interview questions",
  coverage_check: "Checking requirement coverage",
  schedule: "Building the study schedule",
  validate: "Validating the kit",
};

const ICON: Record<ProgressEvent["status"], string> = {
  started: "⏳",
  done: "✅",
  skipped: "⚠️",
  error: "❌",
};

export function ProgressView({
  progress,
  skipped,
  error,
}: {
  progress: ProgressEvent[];
  skipped: SkippedSource[];
  error: { code: string; message: string } | null;
}) {
  const latestByStep = new Map<string, ProgressEvent>();
  for (const event of progress) latestByStep.set(event.step, event);

  return (
    <Card className="space-y-4" aria-live="polite">
      <div className="flex items-center gap-2">
        {!error && <Spinner className="h-5 w-5 text-slate-500" />}
        <h2 className="text-base font-semibold">{error ? "Generation failed" : "Generating your kit..."}</h2>
      </div>

      <ol className="space-y-2 text-sm">
        {Object.entries(STEP_LABELS).map(([key, label]) => {
          const event = latestByStep.get(key);
          return (
            <li key={key} className="flex items-start gap-2">
              <span aria-hidden="true">{event ? ICON[event.status] : "·"}</span>
              <div>
                <p className={event ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}>{label}</p>
                {event && <p className="text-xs text-slate-500 dark:text-slate-400">{event.message}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {skipped.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="mb-1 font-medium">Skipped sources ({skipped.length})</p>
          <ul className="space-y-1">
            {skipped.map((s, i) => (
              <li key={i} className="truncate">
                {s.url} — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <ErrorBanner message={`${error.code}: ${error.message}`} />}
    </Card>
  );
}
