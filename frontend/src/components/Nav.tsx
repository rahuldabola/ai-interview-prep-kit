"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser, useLogout } from "@/lib/hooks/useAuth";
import { Button, IconButton } from "./ui";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "My kits" },
  { href: "/new", label: "New kit" },
];

export function Nav() {
  const { data } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const user = data?.user;

  function signOut() {
    setMenuOpen(false);
    logout.mutate(undefined, { onSettled: () => router.push("/login") });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6" aria-label="Main">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex shrink-0 items-center gap-2 text-sm font-semibold text-ink"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-ink"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 4.5h8.5M4 9h12M4 13.5h7" strokeLinecap="round" />
            </svg>
          </span>
          <span className="hidden sm:inline">AI Interview Prep Kit</span>
          <span className="sm:hidden">Prep Kit</span>
        </Link>

        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden items-center gap-1 md:flex">
              {LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      active ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}

          <ThemeToggle />

          {user ? (
            <>
              <div className="hidden items-center gap-3 md:flex">
                <span className="max-w-[16ch] truncate text-xs text-ink-subtle" title={user.email}>
                  {user.email}
                </span>
                <Button variant="secondary" size="sm" onClick={signOut} loading={logout.isPending}>
                  Sign out
                </Button>
              </div>
              <IconButton
                label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                onClick={() => setMenuOpen((open) => !open)}
                className="md:hidden"
              >
                {menuOpen ? (
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
                  </svg>
                )}
              </IconButton>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {user && menuOpen && (
        <div id="mobile-menu" className="animate-fade-up border-t border-line bg-surface px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={pathname === link.href ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === link.href ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="truncate text-xs text-ink-subtle">{user.email}</span>
              <Button variant="secondary" size="sm" onClick={signOut} loading={logout.isPending}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
