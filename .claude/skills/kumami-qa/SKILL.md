---
name: kumami-qa
description: >-
  Workflow stage 5 — AI-driven QA of a Kumami feature with Playwright in a real browser,
  signed in as the QA Plus and QA Pro accounts on kumami-dev. Covers smoke/regression of
  every page, spec conformance (labels, thresholds, colours, tier gating vs Andrew's
  spec), clicking every button/filter/toggle, data sanity (no NaN/$0/undefined, plausible
  numbers, API payload matches the UI), the admin publish/draft/edit/delete round trip,
  and desktop + mobile screenshots that are actually looked at. Finds bugs, fixes them,
  re-runs, then writes the QA report (docs/qa/) and the manual how-to-test file
  (testing/<area>/<feature>/how-to-test.md). Use after every build before reporting
  done, or when asked to "QA X", "test X properly", "check the site for bugs", "run the
  smoke tests".
---

# Kumami QA (Playwright + AI)

Stage 5 of `docs/DEVELOPMENT_WORKFLOW.md`. The goal is to **find bugs before
Andrew does**, not to produce green ticks. A test that passes on the loading
splash is worse than no test, so always look at the evidence (screenshots,
payloads) yourself.

## One-time setup (already done on Andrew's machine, Oct 2026; re-check if anything fails)

```bash
npm install                                   # @playwright/test is a devDependency
npx playwright install chromium               # browser build must match the installed version
node .claude/skills/kumami-qa/scripts/setup-qa-accounts.mjs   # kumami-dev only; idempotent
```

- **Accounts:** `qa-plus@kumami.test` (role user → Basic + Plus) and `qa-pro@kumami.test` (role admin + isPremium → Pro + `/admin`). Both are email-verified, and their passwords are in `.env.local` as `QA_*`. The script refuses to run against any project except `kumami-dev`.
- **Env:** `.env.local` must also have `FIREBASE_SERVICE_ACCOUNT_JSON`. Without it every `/api/market/*` call returns 401.

## The harness (in the repo)

| File | What |
|---|---|
| `playwright.config.ts` | `desktop` (1440×900) and `mobile` (Pixel 7) projects. Reuses a dev server on :3000 or starts `npm run dev`. Runs serially. |
| `qa/global-setup.ts` | Signs in both accounts and saves sessions to `qa/.auth/*.json` (Firebase auth lives in IndexedDB, so it's saved with `indexedDB: true`). Then warms the data pages (cold dev routes plus an empty market cache time out otherwise). `QA_SKIP_WARMUP=1` skips the warm-up. |
| `qa/helpers.ts` | `guard(page)` records console errors, page errors and failed `/api` calls, checked with `.assertClean()`. `openPage(page, path, {ready})` waits for the real shell (not the splash), catches redirects to the gate, and waits for skeletons to clear. `expectSaneText(page, allow)` flags NaN, undefined, null, `[object Object]`, Infinity, `$0`, % ≥ 200, "coinglass" and lorem ipsum. `snap()` saves screenshots. `apiAsUser(page, '/api/market/x')` returns the payload exactly as the signed-in user gets it. |
| `qa/smoke.spec.ts` | Every Plus page (Plus account) and every Pro tab plus admin calendar (Pro account). Justified exceptions go in `ALLOW_TEXT`. |
| `qa/features/<feature>.spec.ts` | One per feature, written by you from the plan's QA checklist. |

```bash
npm run dev                                         # keep one server running (background) during QA
npx playwright test qa/smoke.spec.ts                # regression, desktop + mobile
npx playwright test qa/features/calendar.spec.ts --project=desktop
npx playwright show-report qa/artifacts/report      # HTML report (for Andrew)
```

Outputs go to `qa/artifacts/` (gitignored): `screens/`, `results/` (failure screenshot, trace and `error-context.md` per failed test) and `report/`.

## Procedure

### 1 · Know what "correct" means
Read the plan's **QA checklist** (`docs/plans/…`), the feature's section in Andrew's spec (the planned or as-built text, with its tables of thresholds, labels and colours), and the Rachelle source it came from. Each checklist line becomes at least one assertion. With no plan (QA of an older feature), derive the checklist from the as-built spec section.

### 2 · Regression first
Start or reuse the dev server, then run `qa/smoke.spec.ts` on both projects. Triage every failure before going further.

### 3 · Write `qa/features/<feature>.spec.ts`
Cover all of these that apply:
- **Spec conformance:** fetch the payload with `apiAsUser` and check that what's rendered matches it. Where a rule engine exists, import it (e.g. `import { computeRegime } from '../../src/lib/market/rules/regime'`) and check that its output for the live inputs equals the label and colour on screen. Check tier gating with both accounts: Plus must not see Pro-only sections, and Pro must.
- **Interaction:** click every button, filter chip, toggle, tab, month arrow, link and popup action. Assert the visible result changes as expected (filtered counts, URL, open/close state), and that nothing throws.
- **Data sanity:** sums match (e.g. Flow Balance bullish + bearish = sum of events), timestamps are fresh (`updatedAt` within its TTL), no impossible values (negative volume, >100% shares, future "last updated"), and empty and error states are honest.
- **Admin round trip** (admin-authored content), with the Pro account in `/admin/…`:
  1. Publish an item titled `[QA] …` and check it appears on the user page.
  2. Save a draft and check it does **not** appear.
  3. Edit the published item and check the change shows.
  4. Delete it and check it's gone.
  5. Always clean up in `afterAll` (via the admin UI, or firebase-admin as a fallback, deleting docs whose title starts with `[QA]`).
- **Visual:** `snap()` the key states at desktop and mobile width.

Use role and text selectors (`getByRole`, `getByText`) over CSS where possible. Never use `waitForTimeout` as an assertion; wait for a concrete state instead.

### 4 · Exploratory pass (the AI part — don't skip)
**Open and look at** the screenshots (Read tool) for every touched page on both widths. Look for overflow, clipped text, overlapping elements, wrong mode or tier badges, empty panels that should have data, inconsistent numbers between panels (e.g. Console vs the Watchlist page), and copy that contradicts the spec. Use the product as a user would: the first-time path, the tour ("Take a tour"), and a tier switch. Write down anything odd, even if no assertion failed.

### 5 · Triage, fix, re-run
Classify each finding:
- **Product bug:** if it's in scope for the feature, fix it and add a unit test for any rule. If out of scope, report it.
- **Harness problem:** fix the test (flaky waits, wrong selector, cold start).
- **Data issue:** e.g. test content in kumami-dev. Report it and add a commented `ALLOW_TEXT` entry until it's cleaned.
- **Spec question:** goes to Andrew.

Re-run until the suite is clean, or remaining items are listed as known issues. Then run the full smoke suite again (regression).

### 6 · Write the outputs
1. **QA report** → `docs/qa/YYYY-MM-DD-<feature>.md`:
   ```markdown
   # QA — <feature> · <date> · dev @ <sha>
   Scope: <pages, accounts, viewports> · Spec: Andrew's spec v<x> "<section>" · Plan: docs/plans/…
   ## Result: ✅ clean | ⚠️ clean with known issues | ❌ blocking issues
   ## Checks run (n passed / n total) — table: check · result · evidence (screenshot/test name)
   ## Bugs found & fixed — what, where, fix (commit)
   ## Known issues (not fixed) — what, why, suggested owner
   ## Observations — UX/copy/consistency notes from the exploratory pass
   ## How to re-run — exact commands
   ```
2. **Manual test** → `testing/<area>/<feature>/how-to-test.md`, written or updated in place, following the conventions in the `feature-test-tutorial` skill. Base it on what you actually verified (same URLs, same sample data). Then update the `testing/README.md` index.
3. Commit the specs, the report and the how-to-test file with the feature: `test(qa): <feature> — <result>`.

## Lessons already learned (Oct 2026)
- "No skeletons" passes on the auth splash. `openPage` waits for `#w-sidebar` and checks the final URL. Keep it that way, and verify by looking at a screenshot the first time you write a new spec.
- The first test after a server start can time out on a cold route and cache. That's why `global-setup` warms up. Before calling slowness a product bug, re-check with a warm server (time the `/api/market/*` call).
- The shared market cache lives in Firestore. Data you see may be up to one TTL old.
- Real bugs caught by the first runs: duplicate React keys from repeated macro events (calendar), and "Spot buying $0M" on Spot Pulse cards (sub-$1M amounts).

## Safety
- Only ever kumami-dev. Never point Playwright or the account script at production.
- Test content always starts with `[QA]` and is deleted afterwards.
- Never print QA passwords or the service account.
