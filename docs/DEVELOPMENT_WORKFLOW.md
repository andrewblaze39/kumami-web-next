# Kumami Development Workflow

_How a feature goes from Rachelle's product doc to a tested build on `dev`._
_Owner: Andrew · Last updated: 10 Oct 2026_

---

## 1. The short version

```
 Rachelle's spec ──► 1 TRANSLATE ──► 2 PLAN ──► 3 BUILD ──► 4 CHECK ──► 5 QA ──► 6 SHIP DOCS ──► 7 PUSH dev ──► (8 RELEASE: Andrew only)
  (Word doc)        into Andrew's     plan file   code +      tests,     Playwright   spec doc:       report to      dev → main
                    spec, flagged     from the    unit tests  types,     AI QA +      remove          Andrew
                    (Planned)         planned               lint,      how-to-test  (Planned),
                                      section               build                   release notes
```

Every feature passes through the same stages. Each stage has an owner, an output and a "done when" check. Claude Code runs stages 1–7 using the project skills in `.claude/skills/`. **Only Andrew does stage 8.**

---

## 2. The documents (and who owns them)

| Document | What it says | Who writes it |
|---|---|---|
| `docs/Rachelle Product Specs/Kumami Website (N).docx` (highest N) | What Rachelle **wants** — the requirements | Rachelle. Never edited by us. |
| `docs/Rachelle Product Specs/Kumami_World_Product_Spec_andrew.docx` | What Kumami **does**, plus what is **planned next** (flagged `(Planned)`). Versioned, with release notes. | Claude, via skill `product-spec-doc-update` |
| `docs/Rachelle Product Specs/Kumami_Gap_Report.docx` (+ `.data.json`) | The difference between the two, in plain language | Claude, via skill `rachelle-gap-analysis` |
| `docs/plans/YYYY-MM-DD-<feature>.md` | The build plan for one feature | Claude, via skill `product-spec-to-feature` |
| `testing/<area>/<feature>/how-to-test.md` | Click-by-click manual test steps for Andrew | Claude, via skill `kumami-qa` |
| `docs/qa/YYYY-MM-DD-<feature>.md` | The QA report: what was tested, bugs found and fixed, screenshots | Claude, via skill `kumami-qa` |

**Andrew's spec doc is the single source of truth for what we build.** Rachelle's doc is the input. We translate it into Andrew's doc first, then we build from Andrew's doc. That way, every decision Andrew makes ("one calendar for Plus and Pro", "Spot Pulse in Pro = the Plus panel for now") is written down before code is written.

---

## 3. The stages in detail

### Stage 0 — Intake (when Rachelle sends something new)
- **Trigger:** a new `Kumami Website (N).docx`, a new sheet, or a message from Rachelle.
- **Do:** run `rachelle-gap-analysis` to see what is new or still missing compared with the current build.
- **Output:** refreshed gap report, plus a short list of candidate features to pick from.
- **Done when:** Andrew has picked what to work on next.

### Stage 1 — Translate into Andrew's spec, flagged `(Planned)`
- **Skill:** `product-spec-doc-update` (planned mode).
- **Do:** write Rachelle's requirement into Andrew's spec doc in Andrew's format (What it is / Where it is / How the user uses it / How we build it), including Andrew's decisions where they differ from Rachelle.
  - **New feature:** a new section whose heading ends with **`(Planned)`** and whose first line is a status line: `PLANNED — from Rachelle's Kumami Website (6) §7 · added in v1.4`.
  - **Change to a live feature:** the live description stays as it is (it must keep describing what the site does today). The change goes in a sub-section `Planned changes (v1.4)` inside that feature.
- **Version:** minor bump (e.g. 1.3 → 1.4). Release-notes entry: `Planned: <feature> (from Rachelle v6 §7)`.
- **🚦 Gate 1:** Andrew reads the planned section and says go, or edits it. For small changes Andrew can say "skip the gate".

### Stage 2 — Plan
- **Skill:** `product-spec-to-feature`.
- **Input:** the `(Planned)` section or `Planned changes` sub-section in **Andrew's** doc (not Rachelle's directly).
- **Do:** check that the CoinGlass endpoints work on our key (live probe), map the work onto the codebase's patterns, split it into buildable-now vs blocked, and list risks.
- **Output:** `docs/plans/YYYY-MM-DD-<feature>.md`. It lists the steps, the files to touch, the tests to add, and the QA checklist that Stage 5 will run.
- **🚦 Gate 2:** Andrew approves the plan (or says "go" up front for small work).

### Stage 3 — Build
- **Branch:** small fixes are committed directly on `dev`. Bigger features go on `feat/<feature>`, branched from `dev`.
- **Do:** follow the plan. Market features follow the existing pipeline: fetchers → rule engine (pure, with unit tests) → contract → builder → API route → UI. Admin-authored content goes in `/admin` and is published to Firestore `pro_*` collections.
- **Rules:** never show fake or placeholder data; never put the provider name ("CoinGlass") in the UI; thresholds live in the rule engines, not in components.

### Stage 4 — Automated checks
`npx vitest run` · `npx tsc --noEmit` · `npx eslint <changed files>` · `npm run build`.
**Done when:** all four pass, and any lint errors are pre-existing ones (compare against `dev`).

### Stage 5 — QA (AI + Playwright)
- **Skill:** `kumami-qa`.
- **Do:** start the app locally and let Playwright drive a real browser, signed in with the QA test accounts (a Plus account and a Pro/admin account in `kumami-dev`). The QA pass covers:
  1. **Smoke:** every touched page loads, with no console errors and no failed API calls.
  2. **Spec conformance:** each rule in the planned section is checked against what the page shows (labels, thresholds, colours, tier gating).
  3. **Interaction:** every button, filter, toggle, tab and link on the feature is clicked and the result checked.
  4. **Data sanity:** numbers are plausible (no `$0`, `NaN`, negative volumes or percentages over 100; timestamps are fresh; totals add up), and the API payload matches what is rendered.
  5. **Admin round trip** (if there's admin content): publish, check it appears; save a draft, check it's hidden; edit, check it updates; delete, check it's gone. Test data is cleaned up afterwards.
  6. **Regression:** a quick smoke test of neighbouring pages (Console, plus the other pages of the same tier).
  7. **Visual:** screenshots at desktop and mobile width, reviewed for broken layout.
- Bugs found are fixed, then the QA pass is re-run until it's clean (or the remaining issues are listed as known issues).
- **Output:** a QA report in `docs/qa/`, plus `testing/<area>/<feature>/how-to-test.md`, written or refreshed.

### Stage 6 — Ship the docs
- **Skill:** `product-spec-doc-update` (ship mode) and then `rachelle-gap-analysis`.
- **Do:** in Andrew's spec, remove the `(Planned)` flag and its status line, rewrite the section to describe what was actually built (including anything deferred, under "Known gaps"), bump the version (e.g. 1.4 → 1.5), and add the release note `Shipped: <feature> — planned flag removed`. Then refresh the gap report so the closed items flip to ✅.

### Stage 7 — Push to `dev` and report
- Merge `feat/<feature>` into `dev` (`--no-ff`), push `dev`, delete the feature branch.
- **Report to Andrew:** what was built, the QA result (passes, bugs fixed, known issues), a link to the how-to-test file, the new spec-doc version, and the gap-report delta.

### Stage 8 — Release to production (**Andrew only**)
Andrew merges `dev` → `main` when he chooses. Claude **never** commits to, merges into, rebases onto or pushes `main`.

---

## 4. Git rules

| Allowed for Claude | Never |
|---|---|
| Commit on `dev`; create `feat/*` branches from `dev`; merge `feat/*` → `dev`; push `dev` and `feat/*` | Anything that changes `main`: commit, merge, rebase, push, or open/merge a PR into it |
| `git fetch`, read `origin/main` for comparison | Force-push `dev`, or rewrite pushed history |

Commit messages: `feat(...)`, `fix(...)`, `docs(spec): v1.5 — …`, `docs(gap-report): …`, `test(qa): …`.

---

## 5. Spec-doc version numbers

| Event | Version change | Release-notes entry |
|---|---|---|
| A feature or change is translated in as planned | minor (1.3 → 1.4) | `Planned: …` |
| A planned feature ships | minor (1.4 → 1.5) | `Shipped: … — planned flag removed` |
| The doc is corrected to match unchanged code | patch (1.5 → 1.5.1) | `Corrections: …` |

Several planned items can share one version, and so can several shipped items. Release notes are history: old entries are never edited.

---

## 6. Definition of done (a feature is "done" only when all are true)

- [ ] Built per the approved plan; anything deferred is written down.
- [ ] Unit tests for new rules; vitest, tsc, build pass; no new lint errors.
- [ ] `kumami-qa` pass is clean, or has known issues listed; QA report written.
- [ ] `how-to-test.md` written or updated.
- [ ] Andrew's spec: `(Planned)` removed, version bumped, release notes added.
- [ ] Gap report refreshed.
- [ ] On `dev`, pushed. `main` untouched.

---

## 7. How to ask Claude

| You say | What happens |
|---|---|
| "Rachelle sent v7 — what's new?" | Stage 0 (gap analysis) |
| "Add Rachelle's §7 Calendar to my spec as planned" | Stage 1, then stops at Gate 1 |
| "Plan the planned Calendar section" | Stage 2, then stops at Gate 2 |
| "Build it" / "Build docs/plans/2026-10-12-calendar.md" | Stages 3–7 |
| "Run the full workflow for <feature>, skip the gates" | Stages 1–7 in one go |
| "QA the Calendar" | Stage 5 only (also good for features built before this workflow) |

The orchestrating skill is `kumami-feature-workflow`. It knows the stages and calls the others.

---

## 8. Environment needed

- `.env.local` (kumami-dev): Firebase public config, `COINGLASS_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON` (without it every `/api/market/*` call returns 401), and the QA accounts `QA_PLUS_EMAIL` / `QA_PLUS_PASSWORD` / `QA_PRO_EMAIL` / `QA_PRO_PASSWORD`.
- Playwright (`@playwright/test`, Chromium) for Stage 5. Setup and accounts: see `.claude/skills/kumami-qa/SKILL.md`.
- CoinGlass plan: STARTUP. Locked endpoints are listed in the gap report's "Blocked" section.

## 9. Known gaps in the workflow itself (to fix)

- **No working dev deployment found.** `kumami-dev.web.app` serves an old static site. Until the App Hosting backend for `dev` is confirmed, "testing on dev" means testing locally.
- **No CI.** Checks only run when Claude or Andrew runs them. A GitHub Action running Stage 4 on every push to `dev` would catch regressions automatically.
- **Production is far behind.** `main` is ~130 commits behind `dev`, and `main` also has commits that aren't on `dev`. Reconcile before the next release.
