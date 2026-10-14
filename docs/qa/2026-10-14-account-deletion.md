# QA — Account deletion · 14 Oct 2026 · branch kumami-dev/account-deletion @ 5a71f77
Scope: `/world/profile` (Profile tab), `/` (deleted notice), `DELETE /api/v1/me`, `/api/v1/kuma/callback`; throw-away qa6/qa7 accounts plus qa3 (read-only); desktop 1440×900 + Pixel 7; production build on :3217 against kumami-dev · Spec: Andrew's spec v1.16 "Basic §8 Account deletion" · Plan: `docs/plans/2026-10-14-account-deletion.md`

## Result: ⚠️ clean with known issues (none in this feature)

## Checks run — feature (8 / 8 passed, desktop + mobile)
| Check | Result | Evidence |
|---|---|---|
| `DELETE /api/v1/me` without a token → 401 `unauthorized` | ✅ | `API guards › without a token` |
| Staff role (`newsdrafter`) → 403 `staff_account`; doc + Auth user still exist | ✅ | `API guards › a staff account is refused` |
| qa3 (superadmin) sees the staff message, no delete button | ✅ | `delete-account-staff` screenshots |
| Panel lists deleted / kept, privacy link; warnings for crypto Pro time + $2.50 referral balance | ✅ | `delete-account-confirm` (desktop + mobile) |
| Button disabled until exact `DELETE` + password; Cancel closes | ✅ | same test |
| Wrong password → "That password is not right.", nothing deleted | ✅ | same test |
| Right password → 200, lands on `/` with the notice **on top** (elementFromPoint) | ✅ | `delete-account-done` |
| Auth user + users doc + 5 subcollections + user_prefs + watchlists + alerts + referralCodes deleted | ✅ | Admin SDK asserts |
| payments / checkout_orders / referral_ledger rows kept | ✅ | Admin SDK asserts |
| Late Kuma callback → 404, chat data not recreated | ✅ | same test |
| Old password can't sign in | ✅ | same test |
| Unit: blocker, Stripe-live detection, step order, failure stops deletion; webhooks never recreate a deleted payer/referrer | ✅ 739/739 | `src/lib/account/__tests__`, `webhooks.test.ts` |

## Regression
- `qa/smoke.spec.ts` (desktop + mobile): 50 / 56. The 6 failures are the data-sanity check "percentage ≥ 200%" on real market numbers (e.g. Console "BTC ETF Net Flow −$479M −267.5% · vs prior 7d"), on Console, On-chain and Flow Radar. Not related to this change; to-do 1125247f.
- Access matrix + legal compliance + payments & referrals (desktop): 116 passed, 2 skipped (Stripe browser tests — no Stripe test keys). A first attempt crashed mid-run when the host restarted (browser exit 0xC0000142); the clean re-run is the result.

## Bugs found & fixed
- The "Your Kumami account has been deleted." notice rendered **behind** the landing page (z-index 60 vs the gate's 200). Playwright's `toBeVisible` still passed; it was found by looking at the screenshot. Fixed: z-index 250, moved below the logo on phones; the test now checks the notice is the top element (commit 1fe9803).
- Test harness: the DELETE response body can't be read after the page navigates, so the test asserts the status only.

## Known issues (not fixed)
- Google re-auth popup and the 5-minute `reauth_required` rule are not covered in the browser (popup can't be automated against real Google; the rule is unit-tested). Manual steps in the how-to-test.
- Card (Stripe) cancellation on delete is unit-tested only. No Stripe test keys on kumami-dev yet.
- Smoke "≥ 200%" market-data flags (above).

## Observations
- The panel copy uses plain words and states what is kept, as the Privacy Policy says. The Flutter app needs its own screen calling the same endpoint (API.md §12).

## How to re-run
```bash
QA_PORT=3217 npx playwright test qa/features/account-deletion.spec.ts      # desktop + mobile
npx vitest run src/lib/account src/lib/billing
```
