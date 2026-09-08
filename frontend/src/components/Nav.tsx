"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser, useLogout } from "@/lib/hooks/useAuth";
import { Button } from "./ui";

export function Nav() {
  const { data } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3" aria-label="Main">
        <Link href={data?.user ? "/dashboard" : "/"} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          AI Interview Prep Kit
        </Link>
        {data?.user && (
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              My kits
            </Link>
            <Link href="/new" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              New kit
            </Link>
            <span className="hidden text-slate-400 sm:inline">{data.user.email}</span>
            <Button
              variant="ghost"
              onClick={() => logout.mutate(undefined, { onSuccess: () => router.push("/login") })}
            >
              Sign out
            </Button>
          </div>
        )}
      </nav>
    </header>
  );
}
