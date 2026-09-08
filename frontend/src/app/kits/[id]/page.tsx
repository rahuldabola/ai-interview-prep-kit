"use client";

import { use } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useKitDetail } from "@/lib/hooks/useKit";
import { Spinner, StatusBadge } from "@/components/ui";
import { ProgressView } from "@/components/kit/ProgressView";
import { CompanyBriefSection } from "@/components/kit/CompanyBriefSection";
import { RequirementsSection } from "@/components/kit/RequirementsSection";
import { QuestionsSection } from "@/components/kit/QuestionsSection";
import { FlashcardsSection } from "@/components/kit/FlashcardsSection";
import { ScheduleSection } from "@/components/kit/ScheduleSection";

export default function KitBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useRequireAuth();
  const { data, isLoading, isError } = useKitDetail(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Spinner className="mr-2 h-5 w-5" /> Loading kit...
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-sm text-red-600">Could not load this kit. It may not exist or you may not have access.</p>;
  }

  const isGenerating = data.status === "draft" || data.status === "generating";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            ← My kits
          </Link>
          <h1 className="text-xl font-semibold">
            {data.kit?.role.title || data.input.jd.slice(0, 60) || "Untitled role"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{data.input.company_url}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {isGenerating && <ProgressView progress={data.progress} skipped={data.skipped} error={data.error} />}

      {data.status === "failed" && (
        <ProgressView progress={data.progress} skipped={data.skipped} error={data.error} />
      )}

      {data.status === "ready" && data.kit && (
        <div className="space-y-4">
          {data.kit.coverage.uncovered_requirement_ids.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {data.kit.coverage.uncovered_requirement_ids.length} requirement(s) still have no covering question
              after {data.kit.coverage.passes} generation pass(es). Add a question by hand, or regenerate the
              relevant category.
            </div>
          )}
          <CompanyBriefSection kitId={id} kit={data.kit} />
          <RequirementsSection kitId={id} kit={data.kit} />
          <QuestionsSection kitId={id} kit={data.kit} />
          <FlashcardsSection kitId={id} kit={data.kit} />
          <ScheduleSection kitId={id} kit={data.kit} />
        </div>
      )}
    </div>
  );
}
