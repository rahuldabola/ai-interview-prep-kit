"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useDeleteKit, useKitList, useRetryKit } from "@/lib/hooks/useKits";
import { useToast } from "@/components/Toaster";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { relativeTime, absoluteTime } from "@/lib/formatDate";
import { Button, Card, EmptyState, ErrorBanner, IconButton, inputClass, Skeleton, StatusBadge } from "@/components/ui";
import type { KitListItem, KitStatus } from "@/lib/types";

type Filter = "all" | KitStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "generating", label: "Building" },
  { value: "failed", label: "Failed" },
];

export default function DashboardPage() {
  useRequireAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useKitList();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingDelete, setPendingDelete] = useState<KitListItem | null>(null);

  const deleteKit = useDeleteKit();
  const retryKit = useRetryKit();
  const { toast } = useToast();

  // Memoised so the empty-array fallback is not a fresh reference on every render, which
  // would invalidate the useMemo calls below each time.
  const kits = useMemo(() => data?.kits ?? [], [data]);

  const counts = useMemo(() => {
    return kits.reduce<Record<string, number>>((acc, kit) => {
      // "draft" is a transient pre-generation state; grouped under Building so the filter
      // counts match what the badges actually show.
      const key = kit.status === "draft" ? "generating" : kit.status;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [kits]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return kits.filter((kit) => {
      const status = kit.status === "draft" ? "generating" : kit.status;
      if (filter !== "all" && status !== filter) return false;
      if (!needle) return true;
      return [kit.source?.role, kit.source?.company, kit.input.company_url, kit.input.jd]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [kits, filter, query]);

  function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    deleteKit.mutate(
      { id: target.id },
      {
        onSuccess: () => toast("Kit deleted.", "success"),
        onError: (err) => toast(err.message || "Could not delete that kit.", "error"),
      }
    );
    setPendingDelete(null);
  }

  function onRetry(kit: KitListItem) {
    retryKit.mutate(
      { id: kit.id },
      {
        onSuccess: () => toast("Generation restarted.", "success"),
        onError: (err) => toast(err.message || "Could not restart generation.", "error"),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">My kits</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {kits.length === 0
              ? "Nothing here yet."
              : `${kits.length} kit${kits.length === 1 ? "" : "s"}${
                  counts.generating ? ` · ${counts.generating} still building` : ""
                }`}
          </p>
        </div>
        <Link href="/new">
          <Button>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M10 4.5v11M4.5 10h11" strokeLinecap="round" />
            </svg>
            New kit
          </Button>
        </Link>
      </div>

      {isError && (
        <ErrorBanner
          message={(error as Error)?.message || "Could not load your kits."}
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
              Try again
            </Button>
          }
        />
      )}

      {kits.length === 0 && !isError ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="10" y="7" width="28" height="34" rx="3" />
              <path d="M17 17h14M17 24h14M17 31h8" strokeLinecap="round" />
            </svg>
          }
          title="No kits yet"
          description="Paste a job description and a company website, and we'll research the company and build your first prep kit."
          action={
            <Link href="/new">
              <Button size="lg">Create your first kit</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Search and filters only earn their space once there are enough kits to sift. */}
          {kits.length > 3 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <svg
                  viewBox="0 0 20 20"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  <circle cx="9" cy="9" r="5.5" />
                  <path d="M13 13l3.5 3.5" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by role, company or URL"
                  aria-label="Search kits"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <div className="flex gap-1 overflow-x-auto scrollbar-slim" role="group" aria-label="Filter by status">
                {FILTERS.map((option) => {
                  const active = filter === option.value;
                  const count = option.value === "all" ? kits.length : (counts[option.value] ?? 0);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(option.value)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        active ? "bg-brand text-brand-ink" : "bg-surface text-ink-muted hover:bg-surface-muted"
                      }`}
                    >
                      {option.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState
              title="Nothing matches that"
              description="Try a different search term, or clear the status filter."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {visible.map((kit) => (
                <KitRow
                  key={kit.id}
                  kit={kit}
                  onDelete={() => setPendingDelete(kit)}
                  onRetry={() => onRetry(kit)}
                  retrying={retryKit.isPending && retryKit.variables?.id === kit.id}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this kit?"
        body={`This permanently removes "${
          pendingDelete?.source?.role || pendingDelete?.input.company_url || "this kit"
        }" and everything in it, including your edits and practice history. This cannot be undone.`}
        confirmLabel="Delete kit"
        loading={deleteKit.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function KitRow({
  kit,
  onDelete,
  onRetry,
  retrying,
}: {
  kit: KitListItem;
  onDelete: () => void;
  onRetry: () => void;
  retrying: boolean;
}) {
  const title = kit.source?.role || firstLine(kit.input.jd) || "Untitled role";
  const company = kit.source?.company;
  const isBuilding = kit.status === "generating" || kit.status === "draft";

  return (
    <Card as="li" className="transition-colors hover:border-line-strong">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {/* The whole title is the link target; the action buttons sit outside it so they
              are not nested inside an anchor. */}
          <Link href={`/kits/${kit.id}`} className="group block">
            <h2 className="truncate font-semibold text-ink group-hover:text-brand">
              {title}
              {company && <span className="font-normal text-ink-muted"> · {company}</span>}
            </h2>
          </Link>
          <p className="mt-1 truncate text-sm text-ink-subtle">{kit.input.company_url}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
            <span>{kit.input.days} day plan</span>
            <span aria-hidden="true">·</span>
            <time dateTime={kit.createdAt} title={absoluteTime(kit.createdAt)} suppressHydrationWarning>
              {relativeTime(kit.createdAt)}
            </time>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={kit.status} />
          {kit.status === "failed" && (
            <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
              Retry
            </Button>
          )}
          {kit.status === "ready" && (
            <Link href={`/kits/${kit.id}/practice`}>
              <Button variant="secondary" size="sm">
                Practise
              </Button>
            </Link>
          )}
          {/* A kit mid-generation has a running job behind it; deleting it would leave that
              job writing to a document that no longer exists. */}
          {!isBuilding && (
            <IconButton
              label="Delete this kit"
              onClick={onDelete}
              className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7}>
                <path d="M4 6h12M8 6V4.5h4V6M6.5 6l.5 9.5h6l.5-9.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          )}
        </div>
      </div>

      {kit.status === "failed" && kit.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/60 dark:text-red-200">
          {kit.error.message}
        </p>
      )}
    </Card>
  );
}

/** A JD's first non-empty line is usually the job title, which beats an arbitrary slice. */
function firstLine(jd: string): string {
  const line = jd
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return line ? line.slice(0, 80) : "";
}
