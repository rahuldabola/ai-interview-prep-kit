import type { KitStatus } from "@/lib/types";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-ink hover:bg-brand-hover shadow-sm",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-muted",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm dark:bg-red-700 dark:hover:bg-red-600",
  ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
  subtle: "bg-brand-soft text-brand hover:bg-brand-soft/70",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs gap-1.5",
  md: "px-3.5 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-base gap-2",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      // `loading` implies disabled, so a double-click cannot fire the same mutation twice.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/** Icon-only button. Takes a required label so it is never unlabelled for a screen reader. */
export function IconButton({
  children,
  label,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const STATUS_META: Record<KitStatus, { label: string; className: string }> = {
  draft: { label: "Queued", className: "bg-surface-muted text-ink-muted" },
  generating: { label: "Building", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  ready: { label: "Ready", className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" },
  failed: { label: "Failed", className: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" },
};

export function StatusBadge({ status }: { status: KitStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
    >
      {status === "generating" && <Spinner className="h-3 w-3" />}
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: "must" | "nice" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        priority === "must"
          ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200"
          : "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200"
      }`}
    >
      {priority === "must" ? "Must-have" : "Nice-to-have"}
    </span>
  );
}

const DIFFICULTY_META: Record<1 | 2 | 3, { label: string; className: string }> = {
  1: { label: "Easy", className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" },
  2: { label: "Medium", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  3: { label: "Hard", className: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200" },
};

export function DifficultyBadge({ difficulty }: { difficulty: 1 | 2 | 3 }) {
  const meta = DIFFICULTY_META[difficulty];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

/** Marks an item the user has changed or written, so regeneration behaviour is predictable. */
export function OriginBadge({ origin }: { origin: "generated" | "edited" | "manual" }) {
  if (origin === "generated") return null;
  return (
    <span
      title={
        origin === "edited"
          ? "You edited this — regenerating this section will not overwrite it."
          : "You added this by hand — regenerating this section will not remove it."
      }
      className="inline-flex shrink-0 items-center rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand"
    >
      {origin === "edited" ? "Edited" : "Yours"}
    </span>
  );
}

export function ErrorBanner({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between dark:border-red-900 dark:bg-red-950/60 dark:text-red-100"
    >
      <div className="flex items-start gap-2.5">
        <svg
          viewBox="0 0 20 20"
          className="mt-0.5 h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path d="M10 6.5v4m0 3h.01" strokeLinecap="round" />
          <circle cx="10" cy="10" r="7.5" />
        </svg>
        <p className="text-balance-pretty">{message}</p>
      </div>
      {action}
    </div>
  );
}

export function InfoBanner({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warning" }) {
  const tones = {
    info: "border-line bg-surface text-ink-muted",
    warning: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-100",
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong bg-surface/50 px-6 py-16 text-center">
      {icon && (
        <div className="text-ink-subtle" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink-muted text-balance-pretty">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return <Tag className={`rounded-card border border-line bg-surface p-4 shadow-sm sm:p-5 ${className}`}>{children}</Tag>;
}

export function Field({
  label,
  children,
  hint,
  error,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  htmlFor?: string;
}) {
  return (
    <div className="block">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-ink-subtle">{hint}</span>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle transition-colors hover:border-brand-ring focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-ring/40 disabled:opacity-60";

/** A horizontal progress meter with an accessible value, used for coverage and practice. */
export function Meter({
  value,
  max,
  label,
  tone = "brand",
}: {
  value: number;
  max: number;
  label: string;
  tone?: "brand" | "emerald" | "amber";
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const bars = {
    brand: "bg-brand",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
    >
      <div className={`h-full rounded-full transition-all duration-500 ${bars[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Skeleton placeholder, so loading states keep the page's shape instead of collapsing. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-surface-muted ${className}`} />;
}

export const PinIcon = ({ filled }: { filled: boolean }) => (
  <svg
    viewBox="0 0 20 20"
    className="h-4 w-4"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 1.5}
    aria-hidden="true"
  >
    <path d="M10 2a1 1 0 011 1v1.1a4.002 4.002 0 013 3.9v2l1.5 3H4.5L6 8v-2a4.002 4.002 0 013-3.9V3a1 1 0 011-1z" />
    <path d="M10 15v3" strokeLinecap="round" />
  </svg>
);
