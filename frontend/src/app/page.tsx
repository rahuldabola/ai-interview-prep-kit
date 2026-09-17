"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/hooks/useAuth";
import { Button, Card, Skeleton } from "@/components/ui";

const STEPS = [
  {
    title: "Paste the posting",
    body: "Drop in the job description and the company's website. That is the whole setup — no profile to fill in first.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" />
        <path d="M9.5 9h5M9.5 12.5h5M9.5 16h3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "We do the research",
    body: "The crawler reads their site for how they hire and looks for public discussion of their interview process — and says so plainly when it finds nothing.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="11" cy="11" r="6" />
        <path d="M15.5 15.5L20 20" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Practise what matters",
    body: "Questions mapped to the role's actual requirements, flashcards ordered by what you know least, and a day-by-day plan that front-loads the hard material.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M5 6.5h14M5 12h14M5 17.5h9" strokeLinecap="round" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    title: "Company brief",
    body: "What they do and how they interview, built only from pages we actually retrieved — with the sources listed.",
  },
  {
    title: "Requirement-mapped questions",
    body: "Technical, behavioural, system-design and company-fit, each tied to a real line from the posting. A coverage check in code re-runs until every must-have has a question.",
  },
  {
    title: "Flashcards + practice mode",
    body: "Cards resurface in confidence order, so the things you keep getting wrong come back first.",
  },
  {
    title: "A schedule that fits your window",
    body: "One day or sixty. The hardest, highest-priority material lands first, with whole-minute time budgets per day.",
  },
  {
    title: "Yours to edit",
    body: "Rewrite, add, reorder, pin. Regenerating a section never overwrites something you changed or pinned.",
  },
  {
    title: "Weak-spots report",
    body: "After practising, see a ranked list of what to restudy next — computed from your own answers, not guessed by a model.",
  },
];

export default function HomePage() {
  const { data, isLoading } = useCurrentUser();
  const signedIn = Boolean(data?.user);

  return (
    <div className="space-y-20 pb-8">
      <section className="flex flex-col items-center gap-6 pt-8 text-center sm:pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Researches the company, then builds the kit
        </span>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink text-balance-pretty sm:text-5xl">
          Walk into the interview knowing what they will ask
        </h1>

        <p className="max-w-2xl text-base text-ink-muted text-balance-pretty sm:text-lg">
          Paste a job description and a company website. Get a company brief, a role breakdown, a categorised question
          bank, flashcards, and a day-by-day study schedule — all editable, all practiseable.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {isLoading ? (
            <Skeleton className="h-11 w-44" />
          ) : signedIn ? (
            <>
              <Link href="/new">
                <Button size="lg">Build a new kit</Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="secondary">
                  Go to my kits
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/register">
                <Button size="lg">Create a free account</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  Sign in
                </Button>
              </Link>
            </>
          )}
        </div>

        <p className="text-xs text-ink-subtle">
          No credit card, no setup. The API runs on a free tier, so the very first request may take a moment to wake up.
        </p>
      </section>

      <section aria-labelledby="how-it-works" className="space-y-6">
        <div className="text-center">
          <h2 id="how-it-works" className="text-2xl font-semibold tracking-tight text-ink">
            How it works
          </h2>
          <p className="mt-2 text-sm text-ink-muted">Three steps, about two minutes of waiting.</p>
        </div>

        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Card key={step.title} as="li" className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  {step.icon}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Step {i + 1}</span>
              </div>
              <h3 className="font-semibold text-ink">{step.title}</h3>
              <p className="text-sm text-ink-muted text-balance-pretty">{step.body}</p>
            </Card>
          ))}
        </ol>
      </section>

      <section aria-labelledby="whats-inside" className="space-y-6">
        <div className="text-center">
          <h2 id="whats-inside" className="text-2xl font-semibold tracking-tight text-ink">
            What is in a kit
          </h2>
          <p className="mt-2 text-sm text-ink-muted">Everything is grounded in the posting and the pages we read.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="flex flex-col gap-2">
              <h3 className="font-semibold text-ink">{feature.title}</h3>
              <p className="text-sm text-ink-muted text-balance-pretty">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Got an interview coming up?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted text-balance-pretty">
          Tell us how many days you have and the schedule adapts to it — one evening of cramming or six weeks of steady
          work.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href={signedIn ? "/new" : "/register"}>
            <Button size="lg">{signedIn ? "Build a new kit" : "Get started free"}</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
