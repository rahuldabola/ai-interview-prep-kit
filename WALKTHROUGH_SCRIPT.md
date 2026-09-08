# Walkthrough video script (3-4 minutes)

Not part of the repo submission — delete or keep locally, your call. A loose script hitting
everything the brief asks the video to cover, in order.

## 1. Create a kit end-to-end (~60s)

- Show the dashboard (empty or with a couple existing kits).
- Click "New kit" → paste a real job description → paste a real company URL (something with
  a findable careers page, e.g. gitlab.com or posthog.com works well since the brief
  name-checks them) → set days to 5.
- Submit, and let the progress view play out on screen — narrate what's happening at each
  step as it lights up: extracting requirements, crawling the company site, searching for
  discussion, writing the brief, generating questions per category, checking coverage.

## 2. Research/generation steps + the second pass (~60s)

- Once ready, open the Company Brief section — point out `hiring_process_notes` and explain
  it came from whatever the crawler actually found (or say plainly if it found nothing).
- Open Requirements — point out the `must` vs `nice` split and that a couple came from
  explicit "required"/"bonus" wording in the JD.
- Point out `coverage.passes` and, if there was a gap, explain the second-pass loop: "every
  must-have requirement needs a question; if one was missing after the first draft, the
  system generated a targeted question just for that gap and re-checked — that's the second
  pass mentioned in Section 4."

## 3. Editing, reordering, and a preserving regeneration (~60s)

- Edit a question's prompt inline — show it saving without a full page reload.
- Drag-reorder two questions within a category (or use the ▲/▼ buttons — mention both work,
  the buttons are the keyboard-accessible path).
- Pin one question or edit one so it's marked "edited".
- Click "Regenerate" on that category. Show that:
  - the edited/pinned question is still there, unchanged
  - the other (untouched) questions got replaced with new ones
- This is the "hardest state problem in the assessment" per the brief — say it directly and
  explain the origin/pinned model in one sentence (generated / edited / manual, only
  untouched "generated" items get replaced).

## 4. Practice mode and the schedule (~45s)

- Open Practice mode. Reveal a card, rate confidence low on purpose.
- Show the coverage bar ticking up.
- Open the Schedule section — point out it spans exactly the requested number of days, and
  that day 1 clearly has denser/higher-priority material than the last day.

## 5. Creative feature + one design decision you'd defend (~30-45s)

- Finish (or fast-forward) the practice session to show the Weak Spots panel — explain it's
  a deterministic aggregation of practice confidence + coverage, not another LLM call, and
  say why: reuses existing data, free, no hallucination risk.
- Pick ONE design decision to defend on camera. Strong options:
  - The generated/edited/pinned/origin state model for regeneration (Section 6).
  - Why flashcards are a deterministic transform instead of a fresh LLM call.
  - Why the schedule is a round-robin over a priority-sorted list rather than a heavier
    bin-packing scheme.
  - Capping coverage passes at 3 instead of looping until clean.

## Closing (~10s)

- Mention the batch CLI briefly: "there's also a `npm run evaluate` command that runs this
  exact same pipeline outside the UI, for grading against unseen postings" — you don't need
  to run it on camera, just say it exists and point at the README.
