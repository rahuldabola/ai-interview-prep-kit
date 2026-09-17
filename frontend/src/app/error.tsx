"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

/**
 * Route-level error boundary. Without this, an unexpected render error in any page shows
 * Next.js's default error screen (or, in production, a blank page) instead of something the
 * user can act on.
 */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaces in the browser console and any attached monitoring, rather than vanishing.
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path d="M12 8v5m0 3.5h.01" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Something went wrong</h1>
      <p className="max-w-md text-sm text-ink-muted text-balance-pretty">
        This page hit an unexpected error. Trying again usually works — your kits are stored on the server and nothing
        here was lost.
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link href="/dashboard">
          <Button variant="secondary">My kits</Button>
        </Link>
      </div>
      {error.digest && <p className="mt-2 font-mono text-xs text-ink-subtle">Reference: {error.digest}</p>}
    </div>
  );
}
