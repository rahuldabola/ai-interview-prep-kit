"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useCreateKit } from "@/lib/hooks/useKits";
import { ApiError } from "@/lib/apiClient";
import { useToast } from "@/components/Toaster";
import { Button, Card, ErrorBanner, Field, InfoBanner, Meter, inputClass } from "@/components/ui";

type BatchRow = { jd: string; company_url: string; days: number };

const JD_MAX_CHARS = 20000;
/** Below roughly this much text there is not enough in the posting to extract real requirements. */
const JD_USEFUL_CHARS = 200;
const DAY_PRESETS = [1, 3, 5, 7, 14, 30];

export default function NewKitPage() {
  useRequireAuth();
  const [tab, setTab] = useState<"single" | "batch">("single");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Create a kit</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          We read the posting, crawl the company site for how they hire, and build your prep material. It usually takes
          one to two minutes.
        </p>
      </div>

      <div className="flex gap-1 border-b border-line" role="tablist" aria-label="Creation mode">
        {(["single", "batch"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t
                ? "border-brand text-brand"
                : "border-transparent text-ink-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            {t === "single" ? "One role" : "Several at once"}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "single" ? <SingleForm /> : <BatchForm />}
      </div>
    </div>
  );
}

function SingleForm() {
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [touched, setTouched] = useState(false);
  const create = useCreateKit();
  const router = useRouter();
  const { toast } = useToast();

  const urlError = useMemo(() => {
    if (!companyUrl.trim()) return undefined;
    return normaliseUrl(companyUrl) ? undefined : "That does not look like a website address.";
  }, [companyUrl]);

  const jdTooShort = jd.trim().length > 0 && jd.trim().length < JD_USEFUL_CHARS;
  const canSubmit = jd.trim().length > 0 && Boolean(normaliseUrl(companyUrl)) && days >= 1 && days <= 60;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const normalised = normaliseUrl(companyUrl);
    if (!jd.trim() || !normalised) return;

    create.mutate(
      { jd: jd.trim(), company_url: normalised, days },
      {
        onSuccess: (data) => {
          if (data.duplicate) {
            toast("You already have a kit for this role — opening it.", "info");
          }
          router.push(`/kits/${data.id}`);
        },
      }
    );
  }

  const errorMessage = create.isError
    ? create.error instanceof ApiError
      ? create.error.message
      : (create.error as Error)?.message || "Could not create the kit."
    : null;

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field
          label="Job description"
          htmlFor="jd"
          hint="Paste the whole posting — responsibilities and requirements are what the questions are built from."
          error={touched && !jd.trim() ? "Please paste the job description." : undefined}
        >
          <textarea
            id="jd"
            required
            rows={12}
            maxLength={JD_MAX_CHARS}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
            placeholder={"e.g.\n\nSenior Backend Engineer\n\nWe're looking for someone to own our billing platform…\n\nRequirements:\n- 5+ years with Node.js and TypeScript\n- Experience designing REST APIs at scale\n…"}
          />
        </Field>

        <div className="flex items-center justify-between gap-3 text-xs">
          <span className={jdTooShort ? "text-amber-600 dark:text-amber-400" : "text-ink-subtle"}>
            {jd.length.toLocaleString()} / {JD_MAX_CHARS.toLocaleString()} characters
            {jdTooShort && " — that is quite short; expect only a few requirements"}
          </span>
          {jd.length > 0 && (
            <button
              type="button"
              onClick={() => setJd("")}
              className="text-ink-subtle underline-offset-2 hover:text-ink hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <Field
          label="Company website"
          htmlFor="company-url"
          hint="Their homepage is enough — we find the careers and about pages ourselves."
          error={touched || companyUrl ? urlError : undefined}
        >
          <input
            id="company-url"
            type="text"
            inputMode="url"
            required
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            className={inputClass}
            placeholder="acme.com"
          />
        </Field>

        <Field label="Days until your interview" htmlFor="days" hint="The schedule is built to fit this window.">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {DAY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={days === preset}
                  onClick={() => setDays(preset)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    days === preset ? "bg-brand text-brand-ink" : "bg-surface-muted text-ink-muted hover:text-ink"
                  }`}
                >
                  {preset === 1 ? "Tomorrow" : `${preset} days`}
                </button>
              ))}
            </div>
            <input
              id="days"
              type="number"
              required
              min={1}
              max={60}
              value={days}
              onChange={(e) => {
                const next = Number(e.target.value);
                // Clamp rather than reject, so typing past the max is self-correcting.
                setDays(Number.isNaN(next) ? 1 : Math.min(60, Math.max(1, next)));
              }}
              className={`${inputClass} max-w-32`}
              aria-describedby="days-help"
            />
            <p id="days-help" className="text-xs text-ink-subtle">
              Anything from 1 to 60 days.
            </p>
          </div>
        </Field>

        {errorMessage && <ErrorBanner message={errorMessage} />}

        <Button type="submit" loading={create.isPending} disabled={!canSubmit && touched} size="lg" className="w-full">
          {create.isPending ? "Starting generation…" : "Generate my kit"}
        </Button>

        <p className="text-center text-xs text-ink-subtle">
          You will see live progress while it builds. It is safe to leave the page — the work continues.
        </p>
      </form>
    </Card>
  );
}

function BatchForm() {
  const [rows, setRows] = useState<BatchRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const create = useCreateKit();
  const router = useRouter();
  const { toast } = useToast();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setRows(null);
    setProgress(null);
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of objects, e.g. [{ "jd": "…" }]');
      if (parsed.length === 0) throw new Error("That file has no rows in it.");
      const validated: BatchRow[] = parsed.map((row, i) => {
        if (!row?.jd || !row?.company_url) {
          throw new Error(`Row ${i + 1} is missing "jd" or "company_url".`);
        }
        const url = normaliseUrl(String(row.company_url));
        if (!url) throw new Error(`Row ${i + 1} has a company_url that is not a valid website address.`);
        const days = Number(row.days) || 5;
        return { jd: String(row.jd), company_url: url, days: Math.min(60, Math.max(1, days)) };
      });
      setRows(validated);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  async function onSubmitAll() {
    if (!rows) return;
    let failed = 0;
    setProgress({ done: 0, total: rows.length, failed: 0 });

    // Submitted one at a time rather than in parallel: each kit kicks off a crawl plus
    // several LLM calls on a free tier, and firing them all at once is the fastest way to
    // hit a rate limit and have most of them fail.
    for (const row of rows) {
      try {
        await create.mutateAsync(row);
      } catch {
        failed += 1;
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1, failed } : p));
    }

    if (failed === rows.length) {
      toast("None of those kits could be started.", "error");
      return;
    }
    toast(
      failed > 0
        ? `Started ${rows.length - failed} of ${rows.length} kits — ${failed} could not be started.`
        : `Started ${rows.length} kit${rows.length === 1 ? "" : "s"}.`,
      failed > 0 ? "info" : "success"
    );
    router.push("/dashboard");
  }

  const running = progress !== null && progress.done < progress.total;

  return (
    <Card className="space-y-5">
      <InfoBanner>
        Got several roles lined up? Upload a JSON array and we will queue them all. Each one becomes its own kit on your
        dashboard.
      </InfoBanner>

      <Field
        label="JSON file"
        htmlFor="batch-file"
        hint='Array of objects: [{ "jd": "…", "company_url": "https://…", "days": 5 }]. "days" defaults to 5.'
      >
        <input
          id="batch-file"
          type="file"
          accept="application/json,.json"
          onChange={onFile}
          disabled={running}
          className="w-full cursor-pointer rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand"
        />
      </Field>

      {parseError && <ErrorBanner message={parseError} />}

      {rows && (
        <div className="rounded-xl border border-line bg-surface-muted/50 p-3 text-sm">
          <p className="font-medium text-ink">
            {rows.length} role{rows.length === 1 ? "" : "s"} ready
          </p>
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-auto scrollbar-slim text-xs text-ink-muted">
            {rows.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 text-ink-subtle">{i + 1}.</span>
                <span className="truncate">
                  {r.company_url} — {r.jd.slice(0, 60)}
                  {r.jd.length > 60 ? "…" : ""} ({r.days}d)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>
              Submitting {progress.done} of {progress.total}
              {progress.failed > 0 && ` · ${progress.failed} failed`}
            </span>
            <span>{Math.round((progress.done / progress.total) * 100)}%</span>
          </div>
          <Meter value={progress.done} max={progress.total} label="Batch submission progress" />
        </div>
      )}

      <Button onClick={onSubmitAll} disabled={!rows} loading={running} size="lg" className="w-full">
        {running ? "Submitting…" : `Generate ${rows?.length ?? ""} kit${rows && rows.length === 1 ? "" : "s"}`.trim()}
      </Button>
    </Card>
  );
}

/**
 * Accepts what people actually type ("acme.com", "www.acme.com") and returns a full URL,
 * or null if it could not be made into one. Without this, a bare domain was sent straight
 * to the API and came back as a validation error for something the user reasonably expected
 * to work.
 */
function normaliseUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    // A hostname with no dot ("localhost", a typo) is not a public company site.
    if (!url.hostname.includes(".") || url.hostname.endsWith(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}
