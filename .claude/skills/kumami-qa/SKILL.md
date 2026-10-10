---
name: kumami-qa
description: >-
  Workflow stage 5 — AI-driven QA of a Kumami feature with Playwright in a real browser,
  using four personas on kumami-dev (qa0 brand-new account every run; fixed qa1 free user,
  qa2 Pro granted by qa3 on the admin Subscriptions page, qa3 superadmin who is not
  subscribed), always including the Plus-vs-Pro
  access/leak matrix (UI + direct API + Firestore rules). Covers smoke/regression of
  every page, spec conformance (labels, thresholds, colours, tier gating vs Andrew's
  spec), clicking every button/filter/toggle, data sanity (no NaN/$0/undefined, plausible
  numbers, API payload matches the UI), the admin-content suite (qa3 authors "[TEST]" items
  in every Plus/Pro admin page, qa2 verifies them, qa1 stays locked),
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

## Personas (kumami-dev only — Andrew, 10 Oct 2026)

| Persona | Created how | Session file | What it proves |
|---|---|---|---|
| **qa0**, brand-new user, **fresh every run** | real sign-up form, deleted after the run | `AUTH.fresh` | the new-user path (sign-up name) and **every test that changes account state**: Grant / expiry / Remove Pro, Firestore-rules probes |
| **qa1**, free user, *fixed* | created once through the sign-up form | `AUTH.plus` | Basic + Plus only, never any Pro |
| **qa2**, subscriber, *fixed* | created once; **qa3 grants Pro (no end date) on `/admin/subscriptions`** whenever qa2 isn't Pro | `AUTH.pro` | full Pro, and Plus pages still show the Plus version |
| **qa3**, superadmin, *not subscribed*, *fixed* | created once; the harness sets `role: superadmin` (stands in for a Role Management change) | `AUTH.admin` | admin pages and the Subscriptions tool work; Pro tabs stay **locked** (admin ≠ Pro); authors all `[TEST]` content |

- Fixed accounts' credentials live in `.env.local` (`QA1_EMAIL`/`QA1_PASSWORD` … `QA3_*`), generated and appended automatically the first time. Missing accounts are re-created. Every run **re-asserts** their state (qa1 free, qa3 superadmin + not Pro, qa2 Pro with no end date, Pro follows cleared), so a broken earlier run can't leave them dirty. **Never mutate qa1/qa2/qa3 in a test — use qa0.**
- `qa/global-setup.ts`, in order: deletes last run's throw-away accounts (`qa0-<run>@…`) and **every `[TEST]` item** in the admin-managed collections (+ the Market Analysis test image), prepares qa3 → qa1 → qa2 → qa0 (sign-up through the gate modal when needed; marks the email verified with the Admin SDK — what clicking the email link does), logs each in through the Log In modal and saves sessions (`indexedDB: true`), then has qa3 grant qa2 Pro on the Subscriptions page if needed. `qa/.auth/personas.json` holds the run's emails/uids (no passwords).
- `qa/global-teardown.ts` deletes **only qa0**. `[TEST]` content is **kept until the next run** so Andrew can look at it (so run `admin-content.spec.ts` last if he should see it). `QA_KEEP_ACCOUNTS=1` keeps qa0 too.
- **Test content:** every free-text value qa3 types starts with `[TEST]` (tickers like ETH and dropdown values stay as-is). Make items believable — a real-sounding analyst, airdrop, headline, event.
- `qa/personas.ts` refuses to run unless both the app and the service account are **kumami-dev**. Never point QA at production (`kumami-6df47`).
- **Scope (Andrew, 10 Oct 2026):** deep-test Plus/Pro work that isn't live on kumami.world yet. Existing live features only get smoke-loaded. QA3 only uses the Pro dashboard admin pages (`/admin/pro-*`). **Ask Andrew before any admin-dashboard change.**
- **Requirements:** `.env.local` (kumami-dev) with `FIREBASE_SERVICE_ACCOUNT_JSON`, plus `npx playwright install chromium` once. If a dev server is already running on :3000 (often Andrew's), Playwright reuses it. Don't kill it.

## The harness (in the repo)

| File | What |
|---|---|
| `playwright.config.ts` | `desktop` (1440×900) and `mobile` (Pixel 7) projects. Reuses a dev server on :3000 or starts `npm run dev`. Runs serially. |
| `qa/personas.ts` | Persona definitions, kumami-dev guard, `deleteFreshAccounts()`, `deleteTestContent()` (all `[TEST]` docs in `pro_research`, `pro_airdrops`, `pro_calendar`, `pro_news`, `pro_events`, `alphaRoom`, `marketAnalysis`), `TEST_IMAGE`. |
| `qa/global-setup.ts` | Cleans up the previous run, prepares the four personas and saves sessions to `qa/.auth/*.json` (Firebase auth lives in IndexedDB, so it's saved with `indexedDB: true`). Then warms the data pages (cold dev routes plus an empty market cache time out otherwise). `QA_SKIP_WARMUP=1` skips the warm-up. |
| `qa/helpers.ts` | `guard(page)` records console errors, page errors and failed `/api` calls, checked with `.assertClean()`. `openPage(page, path, {ready})` waits for the real shell (not the splash), catches redirects to the gate, and waits for skeletons to clear. `expectSaneText(page, allow)` flags NaN, undefined, null, `[object Object]`, Infinity, `$0`, % ≥ 200, "coinglass" and lorem ipsum. `snap()` saves screenshots. `apiAsUser(page, '/api/market/x')` returns the payload exactly as the signed-in user gets it. |
| `qa/smoke.spec.ts` | Every Plus page (qa1), every Pro tab (qa2) and every Pro admin page (qa3). Justified exceptions go in `ALLOW_TEXT`. |
| `qa/features/access-matrix.spec.ts` | **Mandatory in every QA pass.** Plus vs Pro leak checks: UI per persona (every Pro tab locked for qa1/qa3 with no `view=pro` calls; open for qa2; Plus pages = Plus version for all), direct API calls with each persona's token (`?view=pro` gets Pro data only for qa2; pinning and wallet lookup 403 for non-subscribers), a QA3 → QA2/QA1 cross-check (published `[TEST]` research visible to qa2 only), Firestore-rules probes via REST (as qa0), and the Subscriptions tool grant → expiry → remove (on qa0). |
| `qa/features/admin-content.spec.ts` | **Run whenever admin-managed Plus/Pro content or its tabs change.** qa3 authors believable `[TEST]` items in every admin page — Kumami Research, Airdrops & Whitelist (+ checklist), Real-Time News, Events (live + Q&A, upcoming, past/replay), Calendar team events, Alpha Room, Market Analysis (image upload, `qa/fixtures/qa-test-chart.png`) — with publish, draft, edit and delete of a spare. qa2 checks every field renders in the right place (badges, colours, order, details, Follow → Following & Alerts by name, Q&A ask + single upvote, Daily Digest roll-up); qa1 sees the teaser and no `[TEST]` text. Desktop only. |
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
Start or reuse the dev server, then run `qa/smoke.spec.ts` (both projects) **and `qa/features/access-matrix.spec.ts`** (desktop). It takes more than 10 minutes, so run it in the background and read the log. Triage every failure before going further.

### 3 · Write `qa/features/<feature>.spec.ts`
Cover all of these that apply:
- **Spec conformance:** fetch the payload with `apiAsUser` and check that what's rendered matches it. Where a rule engine exists, import it (e.g. `import { computeRegime } from '../../src/lib/market/rules/regime'`) and check that its output for the live inputs equals the label and colour on screen. Check tier gating with both accounts: Plus must not see Pro-only sections, and Pro must.
- **Interaction:** click every button, filter chip, toggle, tab, month arrow, link and popup action. Assert the visible result changes as expected (filtered counts, URL, open/close state), and that nothing throws.
- **Data sanity:** sums match (e.g. Flow Balance bullish + bearish = sum of events), timestamps are fresh (`updatedAt` within its TTL), no impossible values (negative volume, >100% shares, future "last updated"), and empty and error states are honest.
- **Admin round trip** (admin-authored content), qa3 in `/admin/…` (extend `admin-content.spec.ts` for new content types):
  1. Publish an item titled `[TEST] …` and check it appears on the user page for qa2 (and not for qa1 if it's Pro).
  2. Save a draft and check it does **not** appear.
  3. Edit the published item and check the change shows.
  4. Delete it and check it's gone.
  5. Delete a spare item and check it's gone. Keep the main `[TEST]` items (the next run deletes them). Throw-away items made only to test edit/delete can be removed in `afterAll` with `deleteQaDocs(collection, field, prefixes)` from `qa/admin-data.ts`.
  6. Wait for each save to finish (message **and** form reset — the `submit()` helper) before filling the next item; a stale identical message passes too early.
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
- On Windows, the dev server Playwright starts (`webServer`) can keep running after the run ends. Before `npm run build`, check port 3000 (`Get-NetTCPConnection -LocalPort 3000`) and stop the leftover `next ... start-server.js` process you started; `next build` and `next dev` both write `.next`.
- First-visit overlays (the guided tour, high-impact popups) block clicks for fresh accounts. `openPage` dismisses them. A test that asserts on a popup must target it by name (`getByRole('dialog', { name: '…' })`), because the tour can be open at the same time.
- On mobile, the workspace toggle is icon-only and the sidebar is a drawer. Skip text-label navigation tests there (`test.skip(isMobile, …)`) and cover them on desktop.
- The shared market cache lives in Firestore. Data you see may be up to one TTL old.
- One big Playwright run can exhaust memory on Andrew's machine (Claude Code then stops it). Run suites in chunks (see the QA report's re-run commands).
- Real bugs caught by the first runs: duplicate React keys from repeated macro events (calendar), and "Spot buying $0M" on Spot Pulse cards (sub-$1M amounts).

## Safety
- Only ever kumami-dev. Never point Playwright or the account script at production.
- Test content always starts with `[TEST]`; it stays until the next run's setup deletes it.
- Never print QA passwords or the service account.
