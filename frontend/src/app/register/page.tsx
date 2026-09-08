"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRegister } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/apiClient";
import { Button, Card, ErrorBanner, Field, inputClass } from "@/components/ui";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const register = useRegister();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    register.mutate({ email, password }, { onSuccess: () => router.push("/dashboard") });
  }

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <h1 className="mb-4 text-lg font-semibold">Create your account</h1>
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
          <Field label="Password" hint="At least 8 characters">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          {register.isError && (
            <ErrorBanner
              message={register.error instanceof ApiError ? register.error.message : "Something went wrong registering."}
            />
          )}
          <Button type="submit" disabled={register.isPending} className="w-full">
            {register.isPending ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-slate-900 underline dark:text-slate-100">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
