# QA — Subscriptions admin tool + review fixes · 10 Oct 2026 · dev

**Scope:**
- New superadmin Subscriptions page (grant / remove Pro, durations, automatic expiry); the Profile testing buttons are removed.
- Flow Radar Plus "Delayed" labels (page and Console tile).
- Exchange Netflow 24H.
- Sign-up name and Profile name editing.
- 7-day Flow Radar history backfill.
- Full regression.

**Personas** (fresh each run, kumami-dev):
- **qa1:** free user
- **qa2:** granted Pro by qa3 on `/admin/subscriptions`, 1 month
- **qa3:** **superadmin**, not subscribed

**Spec:** Andrew's spec v1.8.

## Result: ✅ clean (known security holes unchanged; they need the rules deploy)

| Suite | Desktop | Mobile |
|---|---|---|
| access-matrix: UI (58) | ✅ 58/58 | — |
| access-matrix: API, cross-check, Firestore rules, **Subscriptions** (15) | ✅ 15/15 | — |
| plus-pro-tools + calendar + sidebar (incl. new sign-up-name test) | ✅ 18/18 | ✅ (sidebar + tools) |
| smoke (Plus pages, 16 Pro tabs, 5 Pro admin pages) | ✅ 28/28, **without** the netflow exception | ✅ |
| Combined mobile run | — | ✅ 37 passed + 1 re-run pass, 2 desktop-only skipped |
| Unit tests / tsc | ✅ 680 passed / clean | |

New checks this round:
- **Subscriptions:** qa1 and qa2 get **403** from the grant API, so only superadmins can grant. qa3 grants qa1 Pro for 1 month: qa1's Pro tabs open and the end date is about 30 days out. An end date set in the past locks qa1 out in both the UI and the API (expiry works). qa3 removes Pro and the status shows Free. Grant and remove both land in `admin_audit`.
- **Setup itself uses the admin tool:** qa3 grants qa2 Pro through `/admin/subscriptions` every run.
- **Sign-up name:** "QA1 Free" shows in the sidebar; renaming in Profile to "QA1 Renamed" updates the sidebar.
- **Netflow 24H:** the smoke text scan no longer finds "$0" on On-Chain.

## Bugs found and fixed this round
1. **Flow Radar Plus showed "Live"** (seen by Andrew on the deployed dev site). The chip depended on data arriving, so it fell back to "Live" while loading or after a failed request. → It's now chosen by version: Plus always shows "Delayed 15m". The Console tile is now named "Flow Radar Plus" with a Delayed chip.
2. **Sign-up name never showed.** It was saved only on the Auth profile, in a write nothing waited for; the shell reads the Firestore user doc. → Saved to both during sign-up; older accounts are copied over on login; Profile → Name is editable.
3. **Liquidation-history cache ignored the exchange list**, so a cross-exchange request could get cached Binance-only data. → The exchange list is now part of the cache key.
4. **Wrapped tokens (WBTC…) could be picked as "extra coins".** → Excluded with the stablecoins.
5. **Backfill:** a whale-transfer chunk failed silently under rate limits (one day showed 323 rows instead of 1003). → Retries, pacing, and a loud warning on give-up.

## Backfill result (kumami-dev)
6 days (4–9 Oct) written, marked `backfilled`: 243–1087 whale rows per day and 0–4 cross-exchange liquidation spikes. With today's live data that's 7 days, so the extra coins now come from the **7-day rule**: XRP (4/7 days), ENA (3/7), LINK, ADA, UNI. Smart-money and netflow-flip history can't be rebuilt, so backfilled days are thinner than live days.
⚠️ The deployed dev site may use a different Firebase project (Andrew: production data). The backfill only ran on kumami-dev. Run `npx tsx --conditions react-server scripts/backfill-flow-history.ts` against that project if needed.

## Known issues (unchanged)
- **Firestore rules holes** (self-upgrade to Pro/superadmin, self-created subscriptions, public `pro_*` reads): `docs/security/2026-10-10-firestore-rules-pro-leaks.md`, awaiting Andrew's go. The new admin tool writes through a superadmin-checked server endpoint, but the browser-side holes still exist.
- Spot Pulse Pro: the first load or timeframe switch on a cold cache can take 20–60s (10 coins × 3 calls); afterwards it refreshes every 15s.
- Alpha Room "Lorem Ipsum" test messages (kumami-dev data).

## How to re-run
```bash
npx playwright test qa/features/access-matrix.spec.ts --project=desktop -g "UI —"
npx playwright test qa/features/access-matrix.spec.ts --project=desktop -g "API —|Cross-check|Firestore rules|Subscriptions admin tool"
npx playwright test qa/features/plus-pro-tools.spec.ts qa/features/calendar.spec.ts qa/features/sidebar-workspaces.spec.ts qa/smoke.spec.ts --project=desktop
npx playwright test qa/smoke.spec.ts qa/features/sidebar-workspaces.spec.ts qa/features/plus-pro-tools.spec.ts --project=mobile
```
(Run in chunks like this. One big run exhausted memory on this machine.)
