"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLogin } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/apiClient";
import { Button, Card, ErrorBanner, Field, inputClass, Skeleton } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-80 w-full max-w-sm" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const router = useRouter();
  const params = useSearchParams();

  // Only ever follow an in-app path. Taking `next` at face value would turn the login page
  // into an open redirect that could bounce a signed-in user to an attacker's site.
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => router.push(next) });
  }

  const errorMessage = login.isError
    ? login.error instanceof ApiError
      ? login.error.message
      : (login.error as Error)?.message || "Something went wrong signing in."
    : null;

  return (
    <div className="mx-auto max-w-sm py-4 sm:py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-1.5 text-sm text-ink-muted">Sign in to pick up where you left off.</p>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="login-email">
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Password" htmlFor="login-password">
            <PasswordInput
              id="login-password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              invalid={login.isError}
            />
          </Field>

          {errorMessage && <ErrorBanner message={errorMessage} />}

          <Button type="submit" loading={login.isPending} className="w-full" size="lg">
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>

      <p className="mt-5 text-center text-sm text-ink-muted">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-brand underline-offset-2 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
