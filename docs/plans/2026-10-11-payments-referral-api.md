# Plan — Payments, Referrals & /api/v1 (spec v1.13: Pro §21, §22, §23, §17 planned changes)

Source: Andrew's spec v1.13: "21. Subscriptions & Payments (Planned)", "22. Referral Program (Planned)",
"23. Backend API platform (Planned)", "17. Kuma AI Chat → Planned changes (v1.13)".
This comes from Andrew's decisions on 11 Oct 2026; none of it is in Rachelle's spec.
Branch: `feat/payments-referral-api` from `dev`.

## Goal
Users can pay for Pro by card (Stripe, renews automatically) or crypto (NOWPayments, prepaid). Every
user gets a unique referral code, and both people are credited when a new user pays with it. All server
logic moves off the old Firebase Functions into `/api/v1` routes in this app, which the website and the
Flutter app both use. `docs/API.md` and `docs/DATABASE.md` document every endpoint and field.

## What exists today (audit, 11 Oct 2026)
| Area | Today | Problem |
|---|---|---|
| Checkout | `kumami-web/functions/index.js` (`api` function): `/api/subscribe-checkout`, `/api/create-crypto-payment`; proxied by `src/app/api/subscribe-checkout` and `src/app/api/create-crypto-payment` | Neither proxy is called (`/world/subscribe` is "Coming soon"). There's no auth check: the body supplies `userId` and `userEmail`. The yearly Stripe price is a placeholder. |
| Stripe webhook | `/api/stripe/webhook` | Only handles `checkout.session.completed`: no renewals, failures or cancellations. Finds the user by email. Hard-codes 30 or 365 days. Has no idempotency check. |
| Crypto webhook | `/api/nowpayments-webhook` | **Never verifies the signature** (it only checks the header exists). Looks up `invoiceId == payment_id`, which are different ids. No amount check. |
| Referral | Codes were made in the CRA browser code (5 characters, `Math.random`, no collision check, so a duplicate overwrites another user's code); rewards are paid inside the webhooks with no transaction | The new site never creates codes, so new accounts have none. Rewards can be paid twice. The balance is a bare number with no history. |
| Unsubscribe | `ProfileContent.tsx` writes `isPremium:false` and `subscriptionStatus` from the browser | It never cancels in Stripe, so the user would keep being charged. The rules allow this browser write. |
| Kuma chat | `/api/chat`, `/api/save-chat` on Functions; called from `useKumaChat.ts` and `KumaAIChatTab.tsx` | No auth: anyone can write into anyone's chat, or fake an AI reply. |
| Push on news | `notifyOnNewsPublish` Firestore trigger | Checks `news.published`, a field news docs don't have, so it never fires. |
| Rules | `referralCodes` readable by anyone; `referrals`/`subscriptions`/`pendingCryptoPayments` can be created by clients | Leaks code owners, and clients can create junk records. |

## Feasibility
| Need | Source | Status |
|---|---|---|
| Stripe Checkout (subscription mode), Billing API, webhooks | `stripe` npm (to add, pinned) | Needs Andrew's **test-mode** secret key, webhook secret, and Monthly + Yearly price ids |
| Stripe hosted page for changing the card | Billing Portal session limited to the `payment_method_update` flow | Configured once in the Stripe dashboard (portal: only "update payment method" on) |
| Crypto invoices + IPN | NOWPayments REST `POST /v1/invoice`, IPN with `x-nowpayments-sig` (HMAC-SHA512 over the body with keys sorted at every level) | Needs a **sandbox** API key + IPN secret. Sandbox base `https://api-sandbox.nowpayments.io/v1` |
| Testing webhooks locally | Stripe CLI `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe` | Andrew installs the Stripe CLI once (`winget install Stripe.StripeCli`) |
| Kuma reply callback | n8n "Kuma AI Agent" workflow | Someone with n8n editor access must point the reply HTTP node at the new callback URL and add the secret header |
| Push notification | `firebase-admin` `messaging().send` to topic `all-users` | Already in deps. The Flutter app subscribes to `all-users` (confirm with the mobile dev) |
| Hosting | Firebase App Hosting (Cloud Run). Secrets go in Secret Manager via the App Hosting backend env | Andrew adds the prod keys at release time |

## Decisions (Andrew, 11 Oct 2026)
- Plans: Monthly **$19.99**, Yearly **$199.99**. No Lifetime.
- Card renews automatically. Crypto is prepaid for 30 or 365 days and stacks on any time left.
- Users get their own Cancel and Resume buttons (Stripe `cancel_at_period_end`). Update card uses Stripe's hosted page.
- Grace period: Pro continues **3 days** past the period end while Stripe retries a failed renewal.
- No second subscription while already Pro, from any source. The only exception is crypto extending crypto.
- Referral: **$1** (Monthly) or **$10** (Yearly) to **both** people, **once per new user**, on that user's first payment. There's no limit on how many people one referrer brings. A refund or chargeback of that payment reverses both credits.
- Reminders: crypto expiry is in-app only. Email reminders and withdrawal are roadmap items (`pr-1`, `pr-2`).
- Referral code: 8 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L), made with `crypto.randomInt`, reserved in a transaction, fixed for now.

## Design

### Money and plans — `src/lib/billing/plans.ts` (pure)
`PLANS = { monthly: {priceCents:1999, days:30, referralRewardCents:100, stripePriceEnv:'STRIPE_PRICE_MONTHLY'}, yearly: {priceCents:19999, days:365, referralRewardCents:1000, stripePriceEnv:'STRIPE_PRICE_YEARLY'} }`.
All money is stored as **integer cents**. Payment amounts checked against Stripe or NOWPayments use these values.

### Pro access — one rule everywhere
Keep `isPremium` and `proUntil` on `users/{uid}`. `lib/pro.ts isProActive()`, `gating.resolveTier`, the Firestore
rules and the admin grant tool already use them, so nothing that reads Pro changes. A new pure function,
`src/lib/billing/entitlement.ts`, derives the user fields from the provider state:

| Source | `isPremium` | `proUntil` |
|---|---|---|
| Stripe `active` / `trialing` | true | `current_period_end + 3d` |
| Stripe `past_due` | true | unchanged (previous period end + 3d), so Pro stops if the retries fail |
| Stripe `canceled` / `unpaid` / `incomplete_expired` | false | `ended_at` |
| Crypto `finished` payment | true | `max(now, current proUntil) + days` |
| Admin grant (unchanged) | true | chosen date, or null |

### Firestore (server-only writes; full reference in `docs/DATABASE.md`)
- **`users/{uid}`**, new or changed fields:
  - Subscription: `subscriptionStatus` (`active` / `past_due` / `canceling` / `canceled` / `expired`), `plan` (`monthly` / `yearly`), `proSource` (`stripe` / `crypto` / `admin`), `cancelAtPeriodEnd`.
  - Stripe ids: `stripeCustomerId`, `stripeSubscriptionId`.
  - Referral: `referralCode`, `referredBy` (uid, set on the first rewarded payment), `referralBalanceCents`, `referralCount`.
  - Retired: `subscriptionId`, `subscriptionPlan`, `subscriptionEndDate`, `subscriptionStartDate`, `paymentMethod`, `referralRewards`, `subscribedAt`.
- **`checkout_orders/{orderId}`**: one per checkout started. Fields: `userId`, `provider`, `plan`, `amountCents`, `referralCode|null`, `status` (`pending` / `paid` / `expired` / `partially_paid` / `failed`), `providerRef` (Stripe session id / NOWPayments invoice id), `createdAt`, `paidAt`. Replaces `pendingCryptoPayments`.
- **`payments/{provider_providerPaymentId}`**: one per successful charge (Stripe invoice id / NOWPayments payment_id). Fields: `userId`, `provider`, `plan`, `amountCents`, `currency`, `periodStart`, `periodEnd`, `orderId`, `isFirstPayment`, `status` (`paid` / `refunded` / `disputed`).
- **`subscriptions/{stripeSubId | crypto_<orderId>}`**: reused, keyed by id, mirroring the provider state. Admin grants keep their existing docs.
- **`webhook_events/{provider_eventId}`**: `type`, `receivedAt`, `processedAt`, `result`. Written in the **same transaction** as the change it applies, so a retried event is skipped.
- **`referralCodes/{code}`**: `userId`, `createdAt`. Server-only; no client reads (validation goes through the API).
- **`referral_rewards/{refereeUid}`**: one per new user ever (the doc id enforces it). Fields: `referrerId`, `refereeId`, `code`, `plan`, `paymentId`, `rewardCentsEach`, `status` (`credited` / `reversed`), `createdAt`, `reversedAt`.
- **`referral_ledger/{autoId}`**: `userId`, `amountCents` (+/-), `type` (`referral_referrer` / `referral_referee` / `reversal` / later `withdrawal`), `rewardId`, `createdAt`. The balance always equals the sum of a user's ledger entries. A unit test plus a QA check confirm it.
- **Retired** (left in place, no longer written): `referrals`, `pendingCryptoPayments`.

### Firestore rules
- `users/{uid}` owner updates switch to an **allowlist** (`hasOnly([...profile fields...])`). The list is built from what the client actually writes: `displayName`, `photoURL`, `bio` and similar, confirmed by grepping every client write. Owners can no longer write `isPremium`, `subscriptionStatus` or any billing or referral field.
- `referralCodes`, `referral_rewards`, `referral_ledger`, `payments`, `checkout_orders`, `webhook_events`: no client writes. Clients may read only their **own** `payments`, `checkout_orders` and `referral_ledger` entries.
- `subscriptions`: no client creates.
- Deploy to kumami-dev with `scripts/deploy-firestore-rules.ts`. **Prod rules are Andrew's step at release.**

### API — `src/app/api/v1/**` (contract in `docs/API.md`)
Shared helpers live in `src/lib/api/v1.ts`:
- `requireUser(req)`: verifies the Firebase ID token as `Bearer`. Reuses `adminAuth`.
- `ok(data)`, and `fail(code, status, message)` returning `{error:{code,message}}`.
- Zod-style hand validation (no new dependency).
- Every route sets `runtime='nodejs'` and `dynamic='force-dynamic'`.

| Method & path | Auth | What it does | Writes |
|---|---|---|---|
| `GET /api/v1/plans` | none | Plans, prices and referral amounts | — |
| `GET /api/v1/me/subscription` | user | Pro status, source, plan, `proUntil`, `cancelAtPeriodEnd`, and whether to show the crypto reminder | — |
| `POST /api/v1/checkout/stripe` `{plan, referralCode?}` | user | Refuses if already Pro (`already_subscribed`). Validates the code (not your own). Creates the Stripe customer once. Creates a Checkout Session (`mode:'subscription'`, `client_reference_id=uid`, metadata `{uid, plan, orderId}`, `subscription_data.metadata` the same, success/cancel URLs from `APP_BASE_URL`). Returns `{url, orderId}` | `checkout_orders`, `users.stripeCustomerId` |
| `POST /api/v1/checkout/crypto` `{plan, referralCode?}` | user | Refuses if Pro from Stripe or admin. Creates the order, then the NOWPayments invoice (`order_id=orderId`, `price_amount`, `price_currency:'usd'`, `ipn_callback_url`, success/cancel URLs). Returns `{invoiceUrl, orderId}` | `checkout_orders` |
| `GET /api/v1/checkout/{orderId}` | user (owner) | Order status, for the success page to poll | — |
| `POST /api/v1/subscription/cancel` | user | Stripe `subscriptions.update(cancel_at_period_end:true)`. The webhook then syncs | (via webhook) |
| `POST /api/v1/subscription/resume` | user | `cancel_at_period_end:false` | (via webhook) |
| `POST /api/v1/subscription/payment-method` | user | Billing Portal session with `flow_data.type='payment_method_update'`. Returns `{url}` | — |
| `GET /api/v1/referral/me` | user | Creates the code if it's missing, in a transaction. Returns the code, web and app links, count, balance, and the latest 50 ledger rows | `referralCodes`, `users.referralCode` |
| `GET /api/v1/referral/validate?code=` | optional user | `{valid, reason:'not_found'|'own_code'|null}`. Rate-limited per IP | — |
| `POST /api/v1/webhooks/stripe` | Stripe signature (raw `req.text()`) | See below | all billing collections |
| `POST /api/v1/webhooks/nowpayments` | HMAC-SHA512 (`timingSafeEqual`) | See below | all billing collections |
| `POST /api/v1/kuma/chat` `{message, chatRoomId?, source?}` | user (uid from the token, not the body) | Saves the user message and calls the n8n chat webhook with `callbackUrl` + `callbackSecret`. Returns 202 `{chatRoomId}` | `users/{uid}/chatrooms/*` |
| `POST /api/v1/kuma/callback` `{userId, chatRoomId, aiResponse}` | `X-Kuma-Secret` header | Saves the assistant message | `users/{uid}/chatrooms/*/messages` |
| `POST /api/v1/admin/news/{id}/notify` | admin | Sends the push for a published news doc. Called once by the admin publish page (needs Andrew's OK, since it's an admin change) | `news/{id}.pushedAt` |

**Stripe webhook** (`src/lib/billing/stripeWebhook.ts`, pure core with injected deps):
1. Verify the signature on the raw body.
2. In a transaction, if `webhook_events/{stripe_eventId}` exists, return 200.
3. Handle the event:
   - `checkout.session.completed`: links the order to the subscription and stores `stripeSubscriptionId`.
   - `invoice.paid`: **re-fetches the subscription from Stripe** rather than trusting event order, writes `payments` and the entitlement, and on the user's first ever payment applies the referral reward.
   - `invoice.payment_failed`: sets `past_due`.
   - `customer.subscription.updated` / `customer.subscription.deleted`: sync the status, `cancelAtPeriodEnd` and the entitlement.
   - `charge.refunded` / `charge.dispute.created`: mark the payment refunded or disputed, remove Pro if it was the current period, and reverse the referral if it was the rewarded payment.
4. Record the event in the same transaction.
5. Return 200. A 500 is returned only on a transient error, so Stripe retries.

**NOWPayments webhook**:
1. Verify the HMAC.
2. Check idempotency (`webhook_events/np_{payment_id}_{payment_status}`).
3. Load `checkout_orders/{order_id}`.
4. On `finished`: require `price_amount`/`price_currency` to match the order. Then mark it paid, write `payments`, extend `proUntil`, and apply the referral if it's the user's first payment.
5. On `partially_paid`: set the order to `partially_paid` (no Pro; an admin settles it).
6. On `failed` / `expired`: set the order status. Every other status is just recorded.

**Referral reward** (`src/lib/billing/referral.ts`). It runs inside the payment transaction, with no separate call. It applies when all of these hold:
- the order has a code;
- the code owner exists and is not the payer;
- `referral_rewards/{payerUid}` doesn't exist yet;
- this is the payer's first `paid` payment.

It then writes the reward doc, two ledger rows and `referredBy`, and increments `referralBalanceCents` and `referralCount` on the referrer and `referralBalanceCents` on the new user. A reversal writes negative ledger rows and decrements both balances, so a balance can go negative; that's fine while there's no withdrawal.

**Code generation** (`src/lib/billing/referralCode.ts`). `generateCode(rand)` is pure. `ensureReferralCode(uid)` loops up to 5 times: generate a code, then in a transaction create `referralCodes/{code}` only if it doesn't exist, and set `users.referralCode` only if it's empty.

### UI (web)
- **`/world/subscribe`** replaces "Coming soon":
  - The two plan cards, a referral box (pre-filled from `?ref=`, which `sessionStorage` keeps through sign-up and is validated live), and Card / Crypto buttons.
  - Signed-out visitors are sent to sign up first, keeping the ref.
  - Already Pro: the page shows the current plan and a "Manage" link instead.
- **`/world/subscribe/success?order=`** polls `GET /checkout/{orderId}` and shows "Activating…", then "You're Pro" or "Still confirming (crypto can take a few minutes)".
- **Profile → Subscription**:
  - Shows the source, plan, status and date.
  - Cancel / Resume / Update card buttons (card only), plus the crypto "Pro until" and the 7-day reminder.
  - The old browser-side Unsubscribe code is removed.
- **Profile → Referrals**: the code, a Copy link button, the count, the balance (`$x.xx`), the history list, and a "Withdrawals coming soon" note.
- **Banner**: crypto Pro ending within 7 days shows a small shell banner ("Pro ends in 3 days — extend"), once per day per browser.
- **Signup**: after the user doc is created, call `GET /api/v1/referral/me` without waiting, so every new account gets a code.
- **Kuma chat**: `useKumaChat.ts` and `KumaAIChatTab.tsx` call `/api/v1/kuma/chat` with the ID token. `NEXT_PUBLIC_API_URL` is removed.

### Deleted
- `src/app/api/subscribe-checkout`, `src/app/api/create-crypto-payment`.
- The unused `src/components/SubscriptionPlans.tsx` and the dead `src/lib/roadmapData.ts` (a separate tiny commit).
- **Firebase Functions:** switched off by Andrew after QA (`firebase functions:delete api prerender notifyOnNewsPublish --project kumami-dev`, then prod at release). The plan includes the exact commands; I don't run any delete without his go.

## Steps (each one a commit on `feat/payments-referral-api`)
1. `lib/api/v1.ts` helpers + `lib/billing/plans.ts`, `entitlement.ts`, `referralCode.ts`, `referral.ts`, with unit tests.
2. Add the `stripe` package (pinned). `lib/billing/stripe.ts` (client + config check). Pure `stripeWebhook.ts` + route, with tests: signature, idempotency, every event type, out-of-order events.
3. `lib/billing/nowpayments.ts` (invoice + HMAC verify) + webhook route, with tests (signed/unsigned/tampered, amount mismatch, partial, replay).
4. Checkout, subscription and referral routes.
5. Firestore rules: users allowlist + new collections. Rules unit probes, then deploy to kumami-dev.
6. UI: Subscribe page, success page, Profile Subscription + Referrals, banner, signup hook.
7. Kuma chat routes + client switch, with a callback secret test.
8. Push-on-publish endpoint (+ the admin publish hook, **if Andrew approves**).
9. Docs: `docs/API.md`, `docs/DATABASE.md` (every collection in the app, not just billing), the ARCHITECTURE.md §4 update, the Flutter handover note `docs/MOBILE_HANDOVER_Payments_Referrals.md`. New skill `api-db-docs` that keeps them in sync, added to the workflow (stage 6).
10. QA (below), then the spec ship-mode update, the gap report, and a merge to `dev`.

## Tests to add (vitest)
- **Plans:** amounts, durations and rewards match the spec table.
- **Entitlement:** every Stripe status maps to the right `isPremium`/`proUntil`, including the 3-day grace; crypto stacking (`max(now, until)+days`); admin grants untouched.
- **Referral code:** alphabet, length 8, uniqueness retry when the first candidate is taken, existing code kept.
- **Referral reward:**
  - credited once and not twice (same new user, second code);
  - a referrer with 2 different new users gets 2 credits;
  - self-referral refused;
  - unknown code ignored without failing the payment;
  - renewal pays nothing;
  - a reversal returns both balances to the values before the reward.
- **Ledger:** after every operation, balance = sum of the ledger.
- **Stripe webhook:**
  - a bad signature gives 400, and the same event twice is applied once;
  - `invoice.paid` before `checkout.session.completed` still works;
  - `subscription.deleted` removes Pro;
  - a refund of the first payment reverses the referral.
- **NOWPayments:** a valid HMAC with nested and unsorted keys passes; a tampered body or missing header gives 401; underpaid → `partially_paid` and no Pro; `finished` twice → one extension.
- **Kuma callback:** missing or wrong secret gives 401.

## QA checklist (kumami-qa, stage 5 — `qa/features/payments-referrals.spec.ts`, desktop + mobile)
Harness change (this is the skill update Andrew asked for):
- Add a second fresh persona, **qa0b** (the "referrer"), created and deleted every run like qa0.
- Add `qa/stripe.ts` helpers: Stripe test card entry on Checkout, test clocks, and a check that the Stripe CLI listener is running.
- Add `qa/nowpayments.ts`: signed sandbox IPN builder.
- Add a "Payments" section to `.claude/skills/kumami-qa/SKILL.md`.

1. A new signup (qa0) gets an 8-character code from the allowed alphabet, shown in Profile → Referrals. Reloading shows the same code.
2. The copied link is `…/world/subscribe?ref=<code>`. Opening it signed out → sign up → Subscribe has the code pre-filled.
3. The referral box shows "valid" for qa0b's code, "not found" for `ZZZZZZZZ`, and "that's your own code" for qa0's own code.
4. `/world/subscribe` shows Monthly $19.99 and Yearly $199.99 only (no Lifetime). There are no `$0`, NaN or undefined values.
5. **Card, Monthly, with qa0b's code:** Stripe test card `4242…` → the success page shows "Activating…", then "You're Pro" within 30s. The Pro tabs unlock.
6. In Firestore after step 5:
   - `users/qa0`: `isPremium` true, `proSource` `stripe`, `plan` `monthly`, `proUntil` ≈ period end + 3 days.
   - One `payments` doc and one `subscriptions` doc.
   - The order is `paid`.
7. Referral after step 5:
   - qa0b's balance is **$1.00** and count is 1; qa0's balance is **$1.00**.
   - There's one `referral_rewards/qa0` doc and two ledger rows.
   - Each balance equals the sum of that user's ledger rows.
8. **Replay:** `stripe events resend <invoice.paid id>` changes nothing: balances are still $1.00 and there's still one payment.
9. A second Checkout attempt while Pro returns `already_subscribed`, and the UI shows Manage instead.
10. **Cancel:** Profile shows "Ends on <date>" and Pro is still active. **Resume:** back to "Renews on <date>".
11. **Update card** opens Stripe's hosted page and returns to Profile.
12. **Renewal (Stripe test clock advanced 1 month):** `proUntil` moves forward a month, a second `payments` doc appears, and the referral is **unchanged**.
13. **Failed renewal** (card `4000 0000 0000 0341`, clock advanced): status shows `past_due` and Pro holds through the grace period. Advancing past the grace until the subscription ends turns Pro off and locks the Pro tabs.
14. **Refund of the first payment** (Stripe API in test mode): the payment is `refunded` and both referral balances go back to $0.00, with reversal ledger rows.
15. **Crypto, Yearly, with a code (signed sandbox IPN):**
    - `finished` → Pro until now + 365 days, and both users get +$10.
    - The same IPN again → no change.
    - A second crypto purchase stacks: + another 365 days, and no second referral credit.
16. **Crypto security:** an unsigned or tampered IPN gets 401 with no change. `partially_paid` gives no Pro and the order is `partially_paid`.
17. **Crypto reminder:** set `proUntil` = now + 3 days on qa0 → the banner and the Profile reminder show. With 10 days left, no banner.
18. **Firestore rules (REST as qa0):**
    - Cannot write `isPremium`, `proUntil`, `subscriptionStatus`, `referralBalanceCents` or `referralCode` on their own user doc.
    - Cannot create `payments`, `referral_ledger` or `referralCodes`.
    - Cannot read another user's `payments` or ledger.
    - Cannot read `referralCodes`.
19. **API auth:** every `/api/v1` user route returns 401 without a token. `kuma/callback` returns 401 without the secret.
20. **Kuma chat:** a qa2 message is saved and the reply appears. Posting with another user's `userId` in the body has no effect, because the uid comes from the token.
21. **Regression:** the smoke suite, `access-matrix.spec.ts` (the admin grant/expiry/remove still works), and screenshots of Subscribe, Success, Profile Subscription and Referrals at desktop and mobile width, reviewed by eye.

## Risks / open questions
- **n8n access:** the chat workflow's reply node must call the new callback URL with the secret header. That needs n8n editor access (Andrew, or whoever owns n8n).
- **Admin page change (ask first):** the News publish page calls `/notify` after publishing. Should the `/admin/subscriptions` "Remove Pro" also **cancel the user's Stripe subscription immediately**? Otherwise a removed user keeps being charged.
- **Stripe API version:** pin it in the client. On recent versions `current_period_end` lives on the subscription *items*, so the code reads the item.
- **Flutter app:** must switch to `/api/v1` and open the returned `url` in a browser or webview. Covered by the handover note. Apple/Google store rules for digital subscriptions sold in-app are the mobile team's call.
- **The deployed dev site uses the prod Firebase project** (existing env quirk), so no payment keys go on it until that's fixed.

## Out of scope (deferred)
- Email reminders and receipts (roadmap `pr-1`), and referral withdrawal (roadmap `pr-2`).
- Plan switching (monthly ↔ yearly), coupons, taxes (Stripe Tax), trials.
- Migrating old CRA-era referral and subscription data (nothing is live).
