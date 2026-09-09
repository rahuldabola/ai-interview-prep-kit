# The AI Interview Prep Kit

Trao Full-Stack Engineering Assessment (FS-AI-INTERVIEW-01). Paste a job description and a
company website; the app crawls the company site, looks for public discussion of how they
interview, and produces a structured prep kit — company brief, role breakdown, categorised
question bank, flashcards, and a day-by-day schedule — that you can edit, reorder, and
practise against.

- **Live app:** https://ai-interview-prep-kit-six.vercel.app
- **Live API:** https://ai-interview-prep-kit.onrender.com
- **Walkthrough video:** _TODO_

> The backend is on Render's free tier, which spins down after inactivity — the first
> request after a while can take ~50s to wake it up. Refresh if the first load times out.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS + TanStack Query + dnd-kit |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB (Atlas free tier) via Mongoose |
| Auth | JWT in an httpOnly cookie (bcrypt password hashing) |
| LLM | Google Gemini — **`gemini-flash-lite-latest`** (free tier) |
| Scraping | Custom crawler (`cheerio` for parsing), no headless browser |
| Validation | `zod`, mirrored on both the wire schema and the Appendix A kit shape |
| Tests | `vitest` |

All choices match the brief's preferred stack except the LLM model and provider selection
process, explained below.

## Why `gemini-flash-lite-latest`

Verified against the real Gemini free tier during development (not assumed from docs):
`gemini-2.5-flash` direct returned a 404 ("no longer available to new users"), and
`gemini-flash-latest` (which currently resolves to `gemini-3.8-flash`) hit a **20
requests/day** free-tier quota wall after a handful of pipeline runs — nowhere near enough
for real usage or repeated grading runs. `gemini-flash-lite-latest` has a materially higher
free daily quota and was fast and reliable across dozens of test runs (a 5-case batch run
completes in ~2 minutes). The model is configurable via `GEMINI_MODEL` in `.env` without
code changes if your key has access to something better.

## Setup

### Local development

```bash
git clone <repo-url>
cd ai-interview-prep-kit

# Backend
cd backend
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, GEMINI_API_KEY
npm run dev             # http://localhost:4000

# Frontend (separate terminal)
cd ../frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev             # http://localhost:3000
```

Environment variables are documented inline in `backend/.env.example` and
`frontend/.env.example`.

### Batch entry point (Section 9)

Runs the exact same pipeline the API uses — no database required:

```bash
cd backend
npm install
cp .env.example .env   # only GEMINI_API_KEY is required for this command
npm run evaluate -- --input <cases.json> --output <kits.json>
```

Or from the repo root: `npm run evaluate -- --input <cases.json> --output <kits.json>`.

A ready-made local fixture company site and sample cases are included for a quick sanity
check without hitting the real internet:

```bash
cd backend
node fixtures/serve.mjs &          # serves a tiny company site on http://localhost:8099
ALLOW_PRIVATE_HOSTS=true npm run evaluate -- --input fixtures/sample-cases.json --output /tmp/kits.json
```

(`ALLOW_PRIVATE_HOSTS` only needs to be `true` when the target company site is on
`localhost`, as it is here — see **Security** below. Leave it `false`/unset for real
company URLs and in production.)

### Deployment

- **Frontend:** Vercel (root directory `frontend`), env var `NEXT_PUBLIC_API_URL` pointing at
  the deployed backend. `NEXT_PUBLIC_*` vars are inlined at build time, so changing it
  requires a redeploy.
- **Backend:** Render free web service (see `render.yaml`), root directory `backend`.
  Build command is `npm install --include=dev && npm run build`, not plain `npm install` —
  Render sets `NODE_ENV=production` at build time, which makes a plain install skip
  devDependencies (`typescript`, `@types/*`), breaking the TypeScript build. Start command
  `npm start`. Env vars: `MONGODB_URI`, `JWT_SECRET` (a real random secret — the app
  refuses to boot in production with the dev default), `GEMINI_API_KEY`, `CORS_ORIGIN` (the
  deployed frontend origin, exactly), `NODE_ENV=production`; the rest have sane defaults.
  Free-tier instances spin down after inactivity — the first request after idle can take
  ~50s.
- **Database:** MongoDB Atlas free (M0) cluster, Network Access set to `0.0.0.0/0` since
  Render's free tier has no fixed outbound IP to allowlist instead.

## High-level architecture

```
frontend/ (Next.js)  --HTTPS, credentials: include-->  backend/ (Express)
                                                              |
                                                    pipeline/ (retrieval + LLM + deterministic steps)
                                                              |
                                            +-----------------+-----------------+
                                            |                                   |
                                   routes/kits.routes.ts              cli/evaluate.ts
                                   (API: persists to MongoDB,          (batch: no DB, writes
                                    drives the builder UI)              Appendix B JSON)
```

Both entry points — the Express generate route and the batch CLI — call the exact same
`runPipeline()` function (`backend/src/pipeline/runPipeline.ts`). Retrieval, extraction,
generation, scheduling, and persistence are separated into distinct modules
(`retrieval/`, `pipeline/`, `services/`, `models/`) rather than living inline in route
handlers.

## Retrieval approach

- **Company site:** `retrieval/crawler.ts` fetches the homepage, then ranks every
  same-site link it finds against a hiring/about keyword vocabulary (`career`, `hiring`,
  `join`, `handbook`, `interview`, `culture`, `about`, ...) scored from both the URL and
  anchor text — not a fixed path list. It fetches the highest-ranked candidates
  breadth-first, up to a page and depth budget, honouring `robots.txt`.
- **Public discussion:** `retrieval/discussionSearch.ts` is a best-effort, key-free search
  (DuckDuckGo's HTML endpoint) restricted to known discussion domains (Glassdoor, Blind,
  Reddit, Comparably, Indeed reviews). It degrades to an honest "nothing found" rather than
  fabricating anything when the search fails or returns nothing.
- **Safety:** every fetch goes through `retrieval/urlSafety.ts` (rejects non-http(s)
  schemes and resolves+blocks private/loopback/link-local addresses) and
  `retrieval/fetchPage.ts` (content-type allowlist, size cap, timeout, per-host rate
  limiting). Unreachable/disallowed sources are recorded and skipped, never fatal to the
  run.

## Research and generation sequencing (Sections 3–4)

Each step is a separate, purpose-built call rather than one prompt that returns everything:

1. **Extract requirements** — LLM call scoped to the pasted JD only (no retrieval needed).
   A deterministic post-check drops any requirement whose key terms don't actually appear
   in the JD text — a hard guard against invention, not just a prompt instruction.
2. **Crawl the company site** — deterministic retrieval, described above.
3. **Search public discussion** — best-effort, described above.
4. **Company brief** — LLM call using only what was actually retrieved.
5. **Generate questions** — separate LLM calls with separate instruction sets per
   requirement *kind*: technical/domain requirements go to one call, behavioural
   requirements to another, plus a dedicated system-design call (informed by whatever the
   crawl found about the hiring process — a company whose careers page describes a
   take-home + system-design round produces different questions than one with no
   information) and a dedicated company-fit call (grounded in the brief).
6. **Coverage check** — deterministic, in code (`pipeline/coverageCheck.ts`). Never
   delegated to the model.
7. **Second pass(es)** — any `must` requirement left uncovered gets a targeted
   regeneration call for exactly that gap, then the check re-runs. Capped at **3 total
   passes**: enough to close nearly every real gap without risking a runaway loop against
   free-tier rate limits. Anything still uncovered after that ships honestly in
   `coverage.uncovered_requirement_ids` rather than being silently invented.
8. **Flashcards** — a deterministic transform of the now-validated questions/requirements,
   not a fresh LLM call. This guarantees correct `requirement_ids` linkage and saves quota.
9. **Schedule** — deterministic allocator, see below.
10. **Validate** — the assembled kit is checked against the Appendix A zod schema (plus
    cross-reference checks: every `question_ids`/`requirement_ids` entry must point at a
    real item) before it's returned or persisted.

## Schedule allocation (Section 8)

All generated questions are sorted by (must-coverage > nice-coverage > uncategorised), then
by difficulty descending, and distributed **round-robin** across exactly `days` buckets.
Round-robin over a priority-sorted list is what produces the required front-loading: day 1
always gets a strictly higher-ranked item at each position than day 2 does at the same
position, so day 1's material is collectively harder/higher-priority without needing a more
complex bin-packing scheme. A day with no assigned material (e.g. a 60-day request against a
thin JD) is still emitted explicitly as a "Review / buffer day" with 0 minutes — the
schedule always has exactly the requested number of days. Minutes are looked up from an
integer table by difficulty (15/25/40 for difficulty 1/2/3), so durations are always whole
minutes, never estimated.

## Generated / edited / pinned state (Section 6)

Every item in `requirements`, `questions`, `flashcards`, and `company_brief` carries two
additive fields not in the original Appendix A example but explicitly permitted by the
brief ("extend it where that genuinely helps"): `origin: "generated" | "edited" | "manual"`
and `pinned: boolean`.

- Editing an item's content flips its `origin` to `"edited"`.
- Adding an item by hand creates it as `"manual"`, pinned `true` by default.
- Regenerating a section (company brief / one question category / schedule) only replaces
  items still at `origin: "generated"` **and** not `pinned` — everything else keeps its id,
  content, and position. Freshly generated replacements are appended after the kept items.
- Coverage is recomputed after every edit that could affect it.

This is implemented once (`pipeline/mergeRegeneration.ts`) and reused by every regenerate
endpoint, so the merge behaviour is consistent everywhere rather than re-derived per
section.

## Generation lifecycle & failure handling (Section 13)

Generation is a fire-and-forget async job on the same Express process (no separate queue —
a documented free-tier trade-off; see Known Limitations). Progress events are written to the
Kit document as each step completes, and the frontend polls every 2s while `status ===
"generating"` to drive the loading view. Any uncaught error marks the kit `"failed"` with a
structured `{ code, message }` rather than leaving it stuck. A repeat submission of the same
JD + company URL by the same user (a sha256 of the two) returns the existing kit instead of
re-spending LLM quota.

## Edge cases (Section 10)

| Case | Behaviour |
|---|---|
| Invalid/404/timeout company URL | Crawl returns no pages, recorded in `skipped`; brief says "no public information could be retrieved" |
| No discoverable hiring/about page | Same as above — never fabricated |
| Two-line JD stub | Extraction returns as few requirements as are actually there; no padding |
| No public discussion found | `discussionSearch` returns empty with an honest note |
| Invalid/malformed LLM JSON | One repair round-trip showing the model its own error, sharing the retry budget; still-invalid output surfaces as a structured pipeline error |
| Rate limit / transient provider failure | Exponential backoff + jitter, shared concurrency limiter across all calls |
| Duplicate JD + company submission | Returns the existing kit rather than regenerating |
| 1-day / 60-day schedule request | Schedule allocator handles both natively — see above |

## Security (Section 11)

- URL validation + private/loopback IP blocking on every fetch (toggleable only for local
  fixture testing via `ALLOW_PRIVATE_HOSTS`, never in production).
- Content-type allowlist, byte size cap, and timeout on every fetch.
- Every piece of untrusted text — the pasted JD and every crawled page — is wrapped in an
  explicitly delimited block (`llm/promptSafety.ts`) with an instruction not to follow any
  instruction found inside it, before it reaches a prompt. This is a mitigation, not a
  guarantee, and is documented as such.

## Practice mode ordering (Section 7)

Confidence-weighted sort: cards with no attempt yet or the lowest recorded confidence come
first, ties broken toward `must`-priority requirements. Chosen over a full spaced-repetition
interval scheduler because it's simpler to reason about and defend, and it directly uses
data the app already collects (no extra state needed) — a reasonable choice for a short
prep window (days, not months), where SRS's long-interval assumptions don't really apply
anyway.

## Frontend interaction design (Section 12)

- **Immediate-feeling edits:** every editable field (`components/kit/EditableField.tsx`)
  updates local state on every keystroke and debounces the network save (~700ms), flushing
  immediately on blur — typing never waits on a round trip, but a fast typist doesn't spam
  the API either.
- **Immediate-feeling reorder:** drag (via `dnd-kit`, pointer + keyboard sensors) and the
  always-visible ▲/▼ buttons both update the TanStack Query cache optimistically before the
  network call resolves, rolling back only if the server rejects it.
- **Keyboard access:** every interactive control is a real `<button>`/`<input>`/`<select>`
  with visible focus states; reordering has a non-drag keyboard path (the ▲/▼ buttons) so
  drag-only interaction is never required.
- **Loading/empty/error states:** a step-by-step progress view during generation
  (`components/kit/ProgressView.tsx`) with per-step status icons and any skipped sources
  surfaced inline; an empty-kits dashboard state with a direct CTA; structured error
  messages surfaced from the API's `{ code, message }` shape rather than generic failures.
- **Responsive:** Tailwind utility layout throughout (stacked on narrow viewports, grid on
  wider ones), no fixed-width containers.

## Creative feature: Weak Spots report

Optional, per the brief. `GET /api/kits/:id/weak-spots` (`pipeline/weakSpots.ts`) aggregates
recorded practice confidence against requirement coverage into a ranked "what to restudy"
list, surfaced at the end of a practice session. It's deterministic — a data aggregation,
not a fresh LLM call — reusing exactly the data the app already collects (coverage +
practice attempts), so it costs nothing extra and can't hallucinate.

**Why this one:** the flashcard stepper and the schedule both treat every requirement as
equally worth your remaining time, but by the time you've practised for a day or two that's
no longer true — you already know some of it. The report answers the actual question a
candidate has mid-prep: "of everything in this kit, what should I spend my next 20 minutes
on?" Ranking logic: a requirement with **no** practised flashcard yet outranks one with a
low *known* confidence (you don't know what you don't know), then ascending average
confidence, then `must`-priority as a tiebreak.

## Testing

`cd backend && npm test` — 20 tests covering schedule allocation (day count, front-loading,
integer minutes, 1-day collapse, over-provisioned buffer days), coverage checking
(must/nice separation), Appendix A structural + cross-reference validation, and the SSRF
guard's default-deny behaviour.

## Known limitations / trade-offs

- The Render free tier spins the backend down after inactivity; the first request after a
  while can take ~50s while it wakes up. A generation kicked off right after a cold start
  still works — it just queues behind the wake-up.
- The crawler parses static HTML only (no headless browser) — a site whose primary
  navigation is rendered client-side (React/Vue hydration) can hide its careers link from a
  plain fetch even though a human browsing it would find it in one click. Verified live
  against gitlab.com: the crawler pulled several real product pages but not the actual
  careers page, and correctly reported "no hiring process information was found" rather
  than fabricating one. Adding a headless-browser fallback (Playwright) would close this
  gap at the cost of materially heavier deploy/runtime requirements.
- No separate job queue for generation — acceptable for a single free-tier instance, but a
  server restart mid-generation loses that job (it would need to be resubmitted).
- The public discussion search is a best-effort heuristic against one key-free search
  endpoint; it can be blocked or rate-limited by the search provider independently of our
  own retries.
- Regenerating the schedule always recomputes it from scratch from the current question
  bank; a day's material rearranged by hand in the builder does not survive a schedule
  regeneration (documented trade-off — there's no separate "edited" state for schedule
  days, since it's the one section defined as pure arithmetic over the current question
  set).
- Free-tier LLM concurrency is capped at 1 in-flight request by default
  (`LLM_MAX_CONCURRENCY`) to stay well under daily/per-minute quotas; this trades some
  latency for reliability under the free tier's real constraints.
