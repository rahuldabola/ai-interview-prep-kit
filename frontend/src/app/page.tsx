"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui";

export default function HomePage() {
  const { data, isLoading } = useCurrentUser();

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">The AI Interview Prep Kit</h1>
      <p className="max-w-xl text-slate-600 dark:text-slate-400">
        Paste a job description and a company website. We research the company, find what we can about how
        they interview, and build you a company brief, a role breakdown, a categorised question bank,
        flashcards, and a day-by-day study schedule — all editable, all practiseable.
      </p>
      {!isLoading && (
        <div className="flex gap-3">
          {data?.user ? (
            <Link href="/dashboard">
              <Button>Go to my kits</Button>
            </Link>
          ) : (
            <>
              <Link href="/register">
                <Button>Create an account</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Sign in</Button>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
