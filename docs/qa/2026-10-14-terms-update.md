# QA — Terms of Service update · 14 Oct 2026 · kumami-dev/terms-update-after-andrew-s-decisions-re-357756

Scope: `/terms`, `/world/terms`, `/privacy`, `/world/subscribe` note, `/sitemap.xml` · logged out, qa1 (free), qa2 (Pro) · desktop 1440×900 + Pixel 7 · against a **production build** (`next start -p 3217`, kumami-dev) · Spec: Andrew's spec v1.17 Basic §7 · To-do 35775685 · Audit: `docs/legal/2026-10-14-compliance-audit.md`

## Result: ⚠️ clean with known issues (none in this feature)

## Checks run

| Check | Result | Evidence |
|---|---|---|
| `qa/features/legal-compliance.spec.ts` + `site-polish.spec.ts` (desktop + mobile) | 58/58 (+2 skipped) | |
| `/terms` public (200, no redirect), title, 13 key section headings, "Last updated: 14 October 2026" | ✅ | `legal-terms-public`, `legal-terms-refunds` |
| 18+ (and no "17 years"), the no-refund sentence, the sanctions line, the AI line | ✅ | |
| Prices and referral amounts match `src/lib/billing/plans.ts` ($19.99/30 days, $199.99/365 days, $1.00/$10.00) | ✅ | |
| Terms and Privacy show the same company line (one shared `LEGAL_ENTITY`) | ✅ | |
| `/world/terms` renders the same Terms in the shell (qa1) | ✅ | `legal-terms-shell` |
| Subscribe note: "non-refundable once a period has started" + Refunds link to `/world/terms#refunds` | ✅ | |
| Sitemap lists `/privacy` and `/terms` | ✅ | |
| Regression smoke (`qa/smoke.spec.ts`) | 6 failures, see Known issues | |
| Typecheck, unit tests (739/739), production build | ✅ | |
| Lint | ❌, but all errors are in files this change doesn't touch (LoginClient, SignupClient, AddCryptoModal, calendar…); the changed files lint clean | |

## Bugs found & fixed
- **Words ran together on the Terms page:** "[Country of registration](\"Kumami\"…" and "30 or 365days of Pro". In the production build, the space straight after a `{value}` at the start of a multi-line JSX text was dropped. Fixed with explicit `{' '}` and added a regression assertion (no digit+"days" and no "](\"Kumami" in the text).

## Known issues (not fixed, not caused by this change)
- Smoke `/world/console`, `/world/onchain`, `/world/flow-radar` (desktop + mobile): the sanity check flags "0 events in 24H · $0 across BTC / ETH / …" in live market data during a quiet window. The same family of issue as to-do 1125247f (sanity rules vs real values).

## Observations
- Company name, country and contact email are still `[placeholders]` on both pages. Must be filled in before main.
- The old Firestore `app_config/terms_and_conditions` doc and `src/assets/Kumami_World_Terms_and_Conditions.pdf` are no longer used.

## How to re-run
```bash
npm run build && npx next start -p 3217
QA_PORT=3217 npx playwright test qa/features/legal-compliance.spec.ts qa/features/site-polish.spec.ts
```
