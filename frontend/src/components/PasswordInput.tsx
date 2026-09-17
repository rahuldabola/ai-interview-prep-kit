"use client";

import { useState } from "react";
import { inputClass } from "./ui";

/**
 * Password field with a show/hide toggle. Typing a password blind into a field you cannot
 * check is a common source of failed sign-ins, and the toggle is a standard affordance.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // aria-pressed rather than a changing label, so a screen reader announces the
        // toggle state instead of two unrelated buttons.
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-subtle transition-colors hover:text-ink"
      >
        {visible ? (
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7}>
            <path d="M3 3l14 14" strokeLinecap="round" />
            <path d="M6.7 6.8C4.9 7.9 3.5 9.5 2.8 10c1.3 1.9 4 4.5 7.2 4.5 1.2 0 2.3-.3 3.3-.9" strokeLinecap="round" />
            <path d="M16.2 12.4c.6-.6 1-1.2 1-1.2-.9-1.4-3.4-4.5-7.2-4.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7}>
            <path d="M2.5 10S5.2 5.5 10 5.5 17.5 10 17.5 10 14.8 14.5 10 14.5 2.5 10 2.5 10z" />
            <circle cx="10" cy="10" r="2.2" />
          </svg>
        )}
      </button>
    </div>
  );
}
