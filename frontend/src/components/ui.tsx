import type { KitStatus } from "@/lib/types";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-slate-900 text-white hover:bg-slate-700 focus-visible:outline-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
    secondary:
      "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
    ghost: "text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400 dark:text-slate-300 dark:hover:bg-slate-800",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function StatusBadge({ status }: { status: KitStatus }) {
  const styles: Record<KitStatus, string> = {
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    generating: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status === "generating" && <Spinner className="h-3 w-3" />}
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: "must" | "nice" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        priority === "must"
          ? "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
          : "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200"
      }`}
    >
      {priority === "must" ? "Must-have" : "Nice-to-have"}
    </span>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      {message}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export const PinIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} aria-hidden="true">
    <path d="M10 2a1 1 0 011 1v1.1a4.002 4.002 0 013 3.9v2l1.5 3H4.5L6 8v-2a4.002 4.002 0 013-3.9V3a1 1 0 011-1z" />
    <path d="M10 15v3" strokeLinecap="round" />
  </svg>
);
