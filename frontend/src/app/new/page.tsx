"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useCreateKit } from "@/lib/hooks/useKits";
import { ApiError } from "@/lib/apiClient";
import { Button, Card, ErrorBanner, Field, inputClass } from "@/components/ui";

type BatchRow = { jd: string; company_url: string; days: number };

export default function NewKitPage() {
  useRequireAuth();
  const [tab, setTab] = useState<"single" | "batch">("single");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Create a kit</h1>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800" role="tablist">
        {(["single", "batch"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t
                ? "border-b-2 border-slate-900 text-slate-900 dark:border-white dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            {t === "single" ? "Single role" : "Batch upload"}
          </button>
        ))}
      </div>

      {tab === "single" ? <SingleForm /> : <BatchForm />}
    </div>
  );
}

function SingleForm() {
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const create = useCreateKit();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { jd, company_url: companyUrl, days },
      {
        onSuccess: (data) => router.push(`/kits/${data.id}`),
      }
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Job description" hint="Paste the full posting text.">
          <textarea
            required
            rows={10}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            className={inputClass}
            placeholder="Paste the job description here..."
          />
        </Field>
        <Field label="Company website">
          <input
            type="url"
            required
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            className={inputClass}
            placeholder="https://example.com"
          />
        </Field>
        <Field label="Days until your interview" hint="Between 1 and 60.">
          <input
            type="number"
            required
            min={1}
            max={60}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        {create.isError && (
          <ErrorBanner message={create.error instanceof ApiError ? create.error.message : "Could not create the kit."} />
        )}
        <Button type="submit" disabled={create.isPending} className="w-full">
          {create.isPending ? "Starting generation..." : "Generate my kit"}
        </Button>
      </form>
    </Card>
  );
}

function BatchForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BatchRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const create = useCreateKit();
  const router = useRouter();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setRows(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array");
      const validated: BatchRow[] = parsed.map((row, i) => {
        if (!row.jd || !row.company_url) {
          throw new Error(`Row ${i + 1} is missing "jd" or "company_url"`);
        }
        return { jd: String(row.jd), company_url: String(row.company_url), days: Number(row.days) || 5 };
      });
      setRows(validated);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not parse that file");
    }
  }

  async function onSubmitAll() {
    if (!rows) return;
    setProgress({ done: 0, total: rows.length });
    for (const row of rows) {
      await create.mutateAsync(row).catch(() => null);
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    router.push("/dashboard");
  }

  return (
    <Card className="space-y-4">
      <Field
        label="Upload a JSON file of description-and-company pairs"
        hint='Array of objects: [{ "jd": "...", "company_url": "https://...", "days": 5 }]'
      >
        <input ref={fileRef} type="file" accept="application/json" onChange={onFile} className={inputClass} />
      </Field>
      {parseError && <ErrorBanner message={parseError} />}
      {rows && (
        <div className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
          <p className="font-medium">{rows.length} role(s) ready to submit</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-slate-500 dark:text-slate-400">
            {rows.map((r, i) => (
              <li key={i} className="truncate">
                {r.company_url} — {r.jd.slice(0, 50)}...
              </li>
            ))}
          </ul>
        </div>
      )}
      {progress && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Submitting {progress.done} / {progress.total}...
        </p>
      )}
      <Button onClick={onSubmitAll} disabled={!rows || create.isPending} className="w-full">
        {progress ? "Submitting..." : "Generate all kits"}
      </Button>
    </Card>
  );
}
