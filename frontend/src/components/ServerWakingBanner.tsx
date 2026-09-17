"use client";

import { useEffect, useState } from "react";
import { onServerWaking } from "@/lib/apiClient";
import { Spinner } from "./ui";

/**
 * The API sits on a free Render instance that spins down after inactivity, so the first
 * request after an idle period can take ~50s. Without this the app just looks frozen and
 * people reload (starting the wait over). Telling them what is happening, and that it is a
 * one-off, is the difference between "broken" and "slow the first time".
 */
export function ServerWakingBanner() {
  const [waking, setWaking] = useState(false);

  useEffect(() => onServerWaking(setWaking), []);

  if (!waking) return null;

  return (
    <div
      role="status"
      className="animate-fade-up sticky top-0 z-40 flex items-center justify-center gap-2.5 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900 sm:text-sm dark:bg-amber-950 dark:text-amber-100"
    >
      <Spinner className="h-3.5 w-3.5 shrink-0" />
      <span>
        Waking the server up — it sleeps when idle on the free tier. This can take up to a minute the first time.
      </span>
    </div>
  );
}
