"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLogin } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/apiClient";
import { Button, Card, ErrorBanner, Field, inputClass } from "@/components/ui";

export default function LoginPage() {
  return (
    <Suspense>
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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => router.push(params.get("next") ?? "/dashboard") }
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <h1 className="mb-4 text-lg font-semibold">Sign in</h1>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          {login.isError && (
            <ErrorBanner
              message={login.error instanceof ApiError ? login.error.message : "Something went wrong signing in."}
            />
          )}
          <Button type="submit" disabled={login.isPending} className="w-full">
            {login.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No account?{" "}
          <Link href="/register" className="font-medium text-slate-900 underline dark:text-slate-100">
            Register
          </Link>
        </p>
      </Card>
    </div>
  );
}
