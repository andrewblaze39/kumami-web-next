# QA — Legal / compliance pass · 14 Oct 2026 · kumami-dev/legal-compliance @ f0232c5

Scope: gate `/`, sign-up modal, `/privacy`, `/world/privacy`, `/world/news`, `/world/console`, `/world/education`, `/world/subscribe`, `/world/pro`, sidebar brand menu · logged out, qa1 (free), qa2 (Pro) · desktop 1440×900 + Pixel 7 · against a **production build** (`next start -p 3217`, kumami-dev) so the Analytics gating is real · Spec: Andrew's spec v1.15 Basic §7 · Audit: `docs/legal/2026-10-14-compliance-audit.md`

## Result: ⚠️ clean with known issues (none in this feature)

## Checks run

| Check | Result | Evidence |
|---|---|---|
| Feature spec `qa/features/legal-compliance.spec.ts` | 21/21 (+1 skipped: brand menu on mobile) | desktop + mobile |
| Banner shows on first visit; no google-analytics / googletagmanager requests before a choice or after Reject | ✅ | `legal-banner-gate` |
| Reject / Accept stored (`kumami_cookie_consent`, version 1) and remembered on reload; "Cookie settings" reopens | ✅ | |
| `/privacy` public (200, no redirect), title, sections, provider table, footer links, sitemap entry | ✅ | `legal-privacy-public` |
| Sign-up "you agree" line (Terms, Privacy, 18+, not financial advice) | ✅ | `legal-signup` |
| Shell legal footer on News / Console / Education (qa1) and Pro (qa2) | ✅ | `legal-shell-footer`, `legal-pro-footer` |
| Subscribe "By paying you agree…" with links | ✅ | |
| Unit tests (consent parsing, analytics only after explicit accept, GA cookie names) | 3/3 (suite 729/729) | `src/lib/__tests__/consent.test.ts` |
| Regression: smoke + site-polish + access matrix (desktop) | 119/122 first run; the 2 access-matrix failures pass on re-run (17/17) | see below |

## Bugs found & fixed
- First feature run: the banner role was changed (dialog → region, so it doesn't clash with modal selectors in other specs) after the build under test was made. Rebuilt and re-ran: 21/21.
- Harness: the banner would cover the mobile tab bar in every existing spec. `qa/global-setup.ts` now answers it (Reject) for each persona before saving sessions, and `dismissOverlays()` rejects it on logged-out pages.

## Known issues (not fixed, not caused by this change)
- Smoke `/world/console`: the sanity check flags "BTC ETF Net Flow −$479M **−267.5%** vs prior 7d". That's a real week-on-week swing in live data, but the percentage is confusing when the flow flips sign. Suggest showing a $ change instead of a % when the sign flips (product follow-up).
- Access matrix: qa3 `/world/pro?tab=airdrops` and the research cross-check stayed on "Loading…" once each; both passed on re-run (a cold-start flake against `next start`).
- Not asserted: that Analytics actually starts after Accept. That needs the kumami-dev measurement ID; the code path is `applyAnalyticsConsent(true)` in `src/lib/firebase.ts`.

## Observations
- The Privacy Policy shows `[Company legal name]`, `[Country of registration]` and `[privacy contact email]` placeholders until Andrew fills in `LEGAL_ENTITY`. Must be done before releasing to main.
- On a short page (Pro tab still loading) the legal footer sits high on the page. That's acceptable.

## How to re-run
```bash
npm run build && npx next start -p 3217        # production build so Analytics gating is real
QA_PORT=3217 npx playwright test qa/features/legal-compliance.spec.ts
QA_PORT=3217 npx playwright test qa/smoke.spec.ts qa/features/site-polish.spec.ts qa/features/access-matrix.spec.ts --project=desktop
```
(If your shell inherited `__NEXT_PROCESSED_ENV` / `NODE_ENV=production` from another Next process, unset them first or `.env.local` won't load.)
