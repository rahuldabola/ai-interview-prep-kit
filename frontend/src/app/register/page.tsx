"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRegister } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/apiClient";
import { Button, Card, ErrorBanner, Field, inputClass } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const register = useRegister();
  const router = useRouter();

  // Mirrors the server's zod rule. Checking it here too means a too-short password is
  // caught before a round trip, rather than coming back as a 400.
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const canSubmit = email.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    register.mutate({ email, password }, { onSuccess: () => router.push("/new") });
  }

  const errorMessage = register.isError
    ? register.error instanceof ApiError
      ? register.error.message
      : (register.error as Error)?.message || "Something went wrong creating your account."
    : null;

  const strength = passwordStrength(password);

  return (
    <div className="mx-auto max-w-sm py-4 sm:py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Create your account</h1>
        <p className="mt-1.5 text-sm text-ink-muted">Free, and takes about ten seconds.</p>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="register-email">
            <input
              id="register-email"
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

          <Field
            label="Password"
            htmlFor="register-password"
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            error={touched && tooShort ? `Please use at least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
          >
            <PasswordInput
              id="register-password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              invalid={touched && tooShort}
            />
          </Field>

          {password.length > 0 && (
            <div className="flex items-center gap-2" aria-hidden="true">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < strength.score ? strength.barClass : "bg-surface-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-ink-subtle">{strength.label}</span>
            </div>
          )}

          {errorMessage && <ErrorBanner message={errorMessage} />}

          <Button type="submit" loading={register.isPending} className="w-full" size="lg">
            {register.isPending ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Card>

      <p className="mt-5 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

/**
 * Advisory only — the server's single rule is the 8-character minimum, and this never
 * blocks a submission. It is here so someone choosing a password gets a nudge toward a
 * better one rather than silence.
 */
function passwordStrength(password: string): { score: number; label: string; barClass: string } {
  if (password.length < MIN_PASSWORD_LENGTH) return { score: 1, label: "Too short", barClass: "bg-red-500" };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
  if (password.length >= 12 && variety >= 3) return { score: 3, label: "Strong", barClass: "bg-emerald-500" };
  if (variety >= 2) return { score: 2, label: "Good", barClass: "bg-amber-500" };
  return { score: 1, label: "Weak", barClass: "bg-amber-500" };
}
