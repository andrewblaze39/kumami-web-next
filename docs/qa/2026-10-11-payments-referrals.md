# QA — Payments, Referrals & /api/v1 · 11 Oct 2026 · `feat/payments-referral-api`

**Scope:**
- `/world/subscribe` and `/world/subscribe/success`.
- Profile → Subscription and Profile → Referrals.
- The crypto "ends soon" banner.
- Every `/api/v1` route.
- Payment webhooks.
- The Firestore rules for billing and referral data.
- Kuma chat routes.
- Regression: the Plus/Pro access matrix and smoke.

**Accounts (kumami-dev):**
- **qa0:** brand-new payer.
- **qa4:** throw-away referrer, created through the Admin SDK.
- **qa1/qa2/qa3:** regression only.

**Viewports:** desktop 1440×900 and mobile (Pixel 7).
**Spec:** Andrew's spec v1.13, Pro §17 and §21–23. **Plan:** `docs/plans/2026-10-11-payments-referral-api.md`.

## Result: ⚠️ clean with known gaps (Stripe end to end waits for test keys)

| Suite | Desktop | Mobile |
|---|---|---|
| Unit tests (`src/lib/billing/__tests__`: 45 billing/API tests; whole repo 725) | ✅ all pass | |
| `qa/features/payments-referrals.spec.ts` | ✅ 27 passed · 2 skipped (Stripe, no keys) | ✅ 27 passed · 2 skipped (one earlier run hit a qa0 session flake on its first test; the re-run was clean) |
| Regression: `smoke.spec.ts` | ✅ all passed (first combined run) | — |
| Regression: `access-matrix.spec.ts` | ✅ 77/77 on the re-run. The first combined run (16 min, heavy load) had 8 failures: 6 Plus market pages timed out (the market routes took 20–50 s under load, while the provider itself answered in 0.4 s), plus 2 "first qa0 test in a group" session restores that landed on the gate (later qa0 tests in the same group passed). Those groups run in order, so 10 dependent tests were skipped | — |
| `tsc` · `eslint` (changed files) · `npm run build` | ✅ clean · ✅ no new errors (the remaining ones were already there) · ✅ | |

## Checks run (plan QA checklist)
| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | New account gets an 8-character code from the allowed alphabet; same code after reload; `referralCodes/{code}.userId` matches | ✅ | `referral codes › qa0…`, `desktop-referrals-empty.png` |
| 2 | Link `…/world/subscribe?ref=CODE` pre-fills the code; signed out, the link is kept through sign-in | ✅ | `referral link pre-fills…`, `signed-out visitor…` |
| 3 | Code check: friend's code valid / own code / unknown / junk; a bad code disables Pay | ✅ | `validate…`, `subscribe-bad-code.png` |
| 4 | Subscribe shows only $19.99 and $199.99 (no Lifetime), Pay buttons follow the plan, no junk values | ✅ | `subscribe.png` (desktop + mobile) |
| 5–14 | Stripe card flow: pay, renew, failed renewal, cancel/resume, update card, replay, refund | ⏭ Skipped in the browser: **needs Stripe test keys**. Covered by 13 Stripe-webhook unit tests (first payment + referral, replay, renewal, out-of-order events, cancel, past_due grace, admin grant untouched, full and partial refund, one reward per new user, referrer credited per friend) | `webhooks.test.ts` |
| 15 | Crypto Yearly with code → Pro +365 days, both get $10.00; same notification again → nothing changes; Monthly purchase stacks +30 days with no second credit | ✅ | `crypto payments › …` |
| 16 | Unsigned / wrong-signature / changed-after-signing notifications → 401, nothing changes; partial payment → no Pro; wrong amount → order `review`, no Pro | ✅ | `crypto payments › …` |
| 17 | Crypto ending in 3 days → banner + Profile reminder; 10 days → none | ✅ | `renew-banner.png` (desktop + mobile) |
| 18 | Firestore rules (REST as qa0): `proUntil`, `isPremium`, `subscriptionStatus`, `referralBalanceCents`, `referralCode`, `stripeCustomerId` → 403; `displayName` → 200; creating payments/ledger/codes → 403; reading another user's code or ledger row → 403; reading own payment and order → 200 | ✅ | `Firestore rules: …` |
| 19 | Every signed-in `/api/v1` route → 401 without a token; `/plans` is public; another user's order → 404; news push → 403 for a normal user | ✅ | `every signed-in…` |
| 20 | Kuma: callback rejected without a token, or with a token for another room or user; accepted with the right one. Chat saves under the **token's** user (a body `userId` is ignored), and the real n8n accepted the message (202) | ✅ | `Kuma callback…`, `Kuma chat…` |
| — | Refund of the rewarded crypto payment reverses both credits, takes back 365 days, ledger sums back to $0 | ✅ | `refund of the rewarded payment…` |
| 21 | Regression: smoke + access matrix (UI per tier, API `?view=pro`, Firestore rules, admin grant / expiry / remove) | ✅ | see above |

## Bugs found & fixed during the build and QA
- **Old regression test expected the browser to still be allowed to cancel** (`access-matrix` “switch Pro off (unsubscribe path)”). That path is now deliberately blocked: it never stopped Stripe billing. The test now expects 403, and the cancel goes through `/api/v1/subscription/cancel`.
- **Transaction buffer lost fields** when a doc was read and then merged. Caught while writing the core; fixed in `BufferedTx` (`6f80603`) and covered by a unit test.
- **Card date shown 3 days late.** `proUntil` includes the grace period, so a new `periodEnd` field is shown instead (unit-tested).
- **After paying, "Open Kumami Pro" still looked locked**, because sign-in data is read once per page load. It's now a full page load.
- **The selected plan wasn't obvious** (screenshot review). Added a stronger outline and "✓ Selected".
- **Profile card width jumped** between tabs, and the **banner had no side margin**. Both fixed.
- **QA harness:** an empty referral balance legitimately reads `$0.00` (allowed explicitly in that one test).

## Known issues / gaps (not fixed)
- **Stripe end to end is not yet run.** Add the test keys and run `stripe listen` (see the how-to-test file). The Stripe browser tests then switch on automatically.
- **Real NOWPayments sandbox** not run yet (no sandbox key). The full browser round trip runs against a local stand-in (see the addendum below); the one thing only the real sandbox proves is that NOWPayments' own signature and body match ours byte for byte.
- **Kuma reply round trip** can't be checked locally (n8n can't reach localhost); the callback is tested directly.
- The reply callback token appears in request logs (it's in the URL). It's limited to one user and chat room for 15 minutes.
- Two simultaneous card checkouts by the same user could, in theory, create two Stripe subscriptions; Stripe Checkout pages also stay open for 24 hours. A follow-up could expire sessions after 30 minutes.
- **Rules are on kumami-dev only.** Production needs `firebase deploy --only firestore:rules --project kumami-6df47` at release, together with the earlier rules fix.

## Observations
- Profile → Subscription now explains each state in plain words (Active / Cancelled — ends at period end / Payment failed — retrying).
- The sidebar's "Basic" under the user name is the workspace mode, not the plan. A Pro user in the Basic workspace still sees "Basic" there, which could confuse people (pre-existing; not changed).

## Addendum 12 Oct 2026 — crypto checkout in the browser
`qa/features/payments-crypto-checkout.spec.ts` with the local NOWPayments stand-in `qa/mocks/nowpayments-mock.mjs` (sandbox-shaped `POST /v1/invoice`, hosted page, the real IPN sequence waiting → confirming → confirmed → sending → finished, signed with the IPN secret). **7/7 desktop, 7/7 mobile.**
- Pay with crypto creates the invoice with the right price, currency, fee setting, IPN and success URLs; the order stores the referral code and invoice id; Cancel returns to "Checkout cancelled — you weren't charged".
- Paying only part → "only part of the amount", no Pro, no credit. Wrong amount → "doesn't match", order `review`.
- Full Monthly payment with a friend's code: every IPN step answered 200, only `finished` granted Pro; success page "You're Pro! … until" +30 days; $1 to both people; "Open Kumami Pro" unlocked.
- Yearly on top stacks exactly 365 days, card stays blocked, no second referral credit; Profile shows the new date.
- Refund of the Yearly payment takes back exactly 365 days and leaves the Monthly referral credit.
- When the time runs out Pro locks and card checkout opens again.
- No bugs found. Small UX note: the "only part / doesn't match" message has no "Back to plans" link.

## How to re-run
```bash
npm run dev                                                    # keep running
npx playwright test qa/features/payments-referrals.spec.ts --project=desktop
npx playwright test qa/features/payments-referrals.spec.ts --project=mobile   # separate run (changes qa0)
npx playwright test qa/features/access-matrix.spec.ts qa/smoke.spec.ts --project=desktop
npx vitest run src/lib/billing
# crypto browser round trip (mock NOWPayments) — see the header of the spec
npx playwright test qa/features/payments-crypto-checkout.spec.ts --project=desktop
```
Manual: `testing/payments/subscriptions-and-referrals/how-to-test.md`.
