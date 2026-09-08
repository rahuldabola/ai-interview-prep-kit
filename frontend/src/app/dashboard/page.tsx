"use client";

import Link from "next/link";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useKitList } from "@/lib/hooks/useKits";
import { Button, Card, EmptyState, Spinner, StatusBadge } from "@/components/ui";

export default function DashboardPage() {
  useRequireAuth();
  const { data, isLoading, isError } = useKitList();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Spinner className="mr-2 h-5 w-5" /> Loading your kits...
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-red-600">Could not load your kits. Try refreshing the page.</p>;
  }

  const kits = data?.kits ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My kits</h1>
        <Link href="/new">
          <Button>New kit</Button>
        </Link>
      </div>

      {kits.length === 0 ? (
        <EmptyState
          title="No kits yet"
          description="Paste a job description and a company website to generate your first interview prep kit."
          action={
            <Link href="/new">
              <Button>Create your first kit</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {kits.map((kit) => (
            <li key={kit.id}>
              <Link href={`/kits/${kit.id}`} className="block">
                <Card className="transition-colors hover:border-slate-400 dark:hover:border-slate-600">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {kit.source?.role || kit.input.jd.slice(0, 60) || "Untitled role"}
                        {kit.source?.company ? ` — ${kit.source.company}` : ""}
                      </p>
                      <p className="truncate text-sm text-slate-500 dark:text-slate-400">{kit.input.company_url}</p>
                    </div>
                    <StatusBadge status={kit.status} />
                  </div>
                  {kit.status === "failed" && kit.error && (
                    <p className="mt-2 text-sm text-red-600">{kit.error.message}</p>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
