# Kumami — API Reference (`/api/v1`)

_Last updated: 11 Oct 2026 · Andrew's spec v1.13 (Pro §17, §21–23) · branch `dev`_
_Companion: [`docs/DATABASE.md`](DATABASE.md) (every collection and field) · [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)_

Everything server-side lives in this Next.js app on **Firebase App Hosting** (Cloud Run). The **website and the Flutter app call the same endpoints.** The old Firebase Functions service (`api-yg5t6jc2da-uc.a.run.app` / `api-h4o777ecua-uc.a.run.app`) is being retired; see §8.

| | |
|---|---|
| Base URL | `https://kumami.world/api/v1` (prod) · `http://localhost:3000/api/v1` (local, kumami-dev) |
| Auth | `Authorization: Bearer <Firebase ID token>`: `await FirebaseAuth.instance.currentUser!.getIdToken()` (Flutter) or `auth.currentUser.getIdToken()` (web). On a `401`, refresh the token (`getIdToken(true)`) and retry once |
| Body | JSON (`Content-Type: application/json`) |
| Errors | `{ "error": { "code": "<stable_code>", "message": "<human text>" } }`. Switch on `code`, show `message` |
| Caching | Every response is `Cache-Control: no-store` |
| Money | Integer US cents (`1999` = $19.99) |
| Common codes | `unauthorized` 401 · `forbidden` 403 · `not_found` 404 · `rate_limited` 429 · `internal` 500 · `billing_not_configured` 503 (payment keys missing on that server) |

---

## 1. Plans

### `GET /plans` — public
Returns the plans, prices and referral rewards. Render prices from this, never hard-code them.
```json
{ "currency": "usd", "plans": [
  { "id": "monthly", "name": "Monthly", "priceCents": 1999, "cryptoDays": 30, "referralRewardCents": 100,
    "card": { "renews": true, "interval": "month" }, "crypto": { "renews": false, "days": 30 } },
  { "id": "yearly",  "name": "Yearly",  "priceCents": 19999, "cryptoDays": 365, "referralRewardCents": 1000,
    "card": { "renews": true, "interval": "year" },  "crypto": { "renews": false, "days": 365 } } ] }
```
Writes nothing. Source: `src/lib/billing/plans.ts`.

---

## 2. My subscription

### `GET /me/subscription` — user
```json
{ "isPro": true, "source": "stripe", "plan": "monthly", "status": "active",
  "proUntil": "2026-11-14T12:00:00.000Z", "periodEnd": "2026-11-11T12:00:00.000Z",
  "cancelAtPeriodEnd": false, "canCancel": true, "canResume": false, "canUpdateCard": true,
  "showRenewReminder": false }
```
| Field | Meaning |
|---|---|
| `source` | `stripe` (card) · `crypto` · `admin` (granted by Kumami) · `null` (never subscribed) |
| `status` | `active` · `canceling` (won't renew) · `past_due` (renewal failed, Stripe retrying) · `canceled` · `expired` · null |
| `proUntil` | When access actually ends (card: + 3-day grace). Null = no end date (admin) |
| `periodEnd` | **The date to show the user**: card = renewal / end date; crypto/admin = `proUntil` |
| `canCancel` / `canResume` / `canUpdateCard` | Which card buttons to show |
| `showRenewReminder` | Crypto Pro ending within 7 days: show "extend" |

Reads `users/{uid}`. Writes nothing.

---

## 3. Checkout

Both checkouts work the same way:
1. Validate the request.
2. Create a `checkout_orders` doc.
3. Return a URL to **open in a browser**. In Flutter, use `url_launcher` or an in-app browser tab.

**Pro is never granted by these calls.** It's granted only by the verified webhook (§6). After payment the provider sends the user to `…/world/subscribe/success?order=<orderId>`. Apps should poll `GET /checkout/{orderId}`.

### `POST /checkout/stripe` — user
Request: `{ "plan": "monthly" | "yearly", "referralCode": "KQ7MZ3PA" (optional) }`
Response `200`: `{ "url": "https://checkout.stripe.com/c/pay/…", "orderId": "…" }`
| Error | When |
|---|---|
| `invalid_plan` 400 | Plan isn't `monthly`/`yearly` |
| `invalid_referral_code` 400 | The code doesn't exist, or is the caller's own (message says which) |
| `already_subscribed` 409 | Already Pro (any source), or a live card subscription exists |
| `user_not_found` 404 | No `users/{uid}` doc yet |
| `billing_not_configured` 503 | `STRIPE_*` env missing |

Steps:
1. Creates `checkout_orders/{orderId}` (`provider:'stripe'`, `status:'pending'`, `referralCode`).
2. Creates the Stripe Customer once per user (`users.stripeCustomerId`).
3. Creates a Checkout Session: `mode: subscription`, `client_reference_id = uid`, metadata `{uid, plan, orderId}` on both the session and the subscription. Success URL `/world/subscribe/success?order=…`, cancel URL `/world/subscribe?cancelled=1`.

Both Stripe calls use idempotency keys.

### `POST /checkout/crypto` — user
Request: the same as card. Response `200`: `{ "invoiceUrl": "https://nowpayments.io/payment/?iid=…", "orderId": "…" }`
Errors: the same as card, plus `provider_error` 502 (NOWPayments didn't create the invoice).
- `already_subscribed` applies when Pro comes from card or admin. **Crypto may extend crypto**: the days stack.
- Creates `checkout_orders/{orderId}` (`provider:'crypto'`), then a NOWPayments invoice with `order_id = orderId`, `price_amount = 19.99 | 199.99 USD`, and `ipn_callback_url = /api/v1/webhooks/nowpayments`.

### `GET /checkout/{orderId}` — user (owner only)
```json
{ "orderId": "…", "provider": "crypto", "plan": "yearly", "status": "paid", "lastStatus": "finished",
  "subscription": { …same shape as GET /me/subscription… } }
```
- `status`: `pending` · `paid` · `partially_paid` · `review` · `failed` · `expired` · `refunded`.
- Another user's order returns `not_found` 404.
- Poll about every 3 s on the success screen. Card payments flip in seconds; crypto takes minutes.

---

## 4. Manage a card subscription

All three return `no_card_subscription` 409 when the caller has no live Stripe subscription. Stripe applies the change, and the Stripe webhook then updates `users/{uid}` (`cancelAtPeriodEnd`, `subscriptionStatus`). Re-read `GET /me/subscription` after a second or two.

| Endpoint | Does | Response |
|---|---|---|
| `POST /subscription/cancel` | `cancel_at_period_end = true`: no more charges, Pro until the period end | `{ cancelAtPeriodEnd: true, endsAt }` |
| `POST /subscription/resume` | Undoes a cancel before the period ends | `{ cancelAtPeriodEnd: false }` |
| `POST /subscription/payment-method` | Stripe-hosted "update card" page (Billing Portal, `payment_method_update` flow). Returns to `/world/profile?tab=subscription` | `{ url }`: open in a browser |

Crypto has nothing to cancel: access simply ends on `proUntil`.

---

## 5. Referrals

### `GET /referral/me` — user
Creates the caller's code if they don't have one (that's how new accounts get a code: the website calls it right after sign-up, and the app should too).
```json
{ "code": "KQ7MZ3PA",
  "links": { "web": "https://kumami.world/world/subscribe?ref=KQ7MZ3PA", "app": "kumami://subscribe?ref=KQ7MZ3PA" },
  "referralCount": 2, "balanceCents": 1100, "rewards": { "monthly": 100, "yearly": 1000 },
  "withdrawalsAvailable": false,
  "ledger": [ { "id": "…", "amountCents": 1000, "type": "referral_referrer", "reason": null, "createdAt": "…" } ] }
```
- `ledger` is newest first, up to 50 rows. `type` is `referral_referrer` (a friend paid with your code), `referral_referee` (you paid with a friend's code) or `reversal` (that payment was refunded).
- Error: `user_not_found` 404 if the profile doc doesn't exist yet. Retry after sign-up finishes.
- Writes `referralCodes/{code}` and `users.referralCode`, in a transaction and only if missing.

### `GET /referral/validate?code=XXXXXXXX` — auth optional
`{ "valid": true, "reason": null }` or `{ "valid": false, "reason": "not_found" | "own_code" | "malformed" }`.
- Send the token so `own_code` can be detected.
- Rate-limited to 30 per minute per IP (`rate_limited` 429).
- Input is normalised: case-insensitive, and spaces and dashes are ignored.

**Reward rule** (applied inside the payment webhook):
- On the payer's **first paid payment** with a valid code, **both** people get the plan's reward: $1 for monthly, $10 for yearly.
- **Once per new user, ever.** A referrer can bring unlimited new users.
- Renewals pay nothing.
- A refund or chargeback of that payment reverses both credits in full.

There's no withdrawal yet: the balance is tracked only.

---

## 6. Webhooks (server-to-server; not for apps)

### `POST /webhooks/stripe`
- **Auth:** the `Stripe-Signature` header, verified on the raw body with `STRIPE_WEBHOOK_SECRET`.
- **Responses:**
  - 200 when processed or safely ignored;
  - 400 for a bad signature;
  - 500 on a transient failure, so Stripe retries. Retries are safe: each event id is applied once.
- **Subscribe the endpoint (Stripe Dashboard → Developers → Webhooks) to:**
  - `checkout.session.completed`
  - `invoice.paid`, `invoice.payment_failed`
  - `customer.subscription.created`, `.updated`, `.deleted`
  - `charge.refunded`, `charge.dispute.created`

| Event | Effect |
|---|---|
| `invoice.paid` | Re-reads the subscription from Stripe. Writes `payments/stripe_<invoice>`; on the first payment sets `users.firstPaidAt` and applies the referral. Marks the order `paid`. Syncs Pro |
| `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed` | Re-reads the subscription and syncs `users` (Pro, `proUntil`, status, `cancelAtPeriodEnd`) and `subscriptions/{subId}` |
| `charge.refunded` | Marks the payment `refunded`/`partially_refunded` and reverses the referral if it was the rewarded payment. A **full** refund also cancels the Stripe subscription immediately, so Pro ends |
| `charge.dispute.created` | Like a full refund (`disputed`) |

Pro mapping:
- `active` → Pro until period end + 3 days.
- `past_due` → Pro until the previous period end + 3 days (grace while Stripe retries).
- `canceled`/`unpaid`/`incomplete_expired` → Pro off. This only switches off Pro that came from this subscription; an admin or crypto grant is never touched.

### `POST /webhooks/nowpayments`
- **Auth:** the `x-nowpayments-sig` header must equal HMAC-SHA512(`NOWPAYMENTS_IPN_SECRET`, `JSON.stringify(body with keys sorted at every level)`). Otherwise 401, and nothing happens.

| `payment_status` | Effect |
|---|---|
| `finished` | Requires `price_amount`/`price_currency` to equal the order. Then: Pro until max(now, current crypto end) + 30/365 days; `payments/np_<payment_id>`; referral on the first payment; order `paid`. A mismatch puts the order in `review` with no Pro |
| `partially_paid` | Order `partially_paid`, no Pro (an admin settles it) |
| `failed` / `expired` | Order status updated |
| `refunded` | Payment `refunded`, referral reversed, and the 30/365 days taken back |
| others (`waiting`, `confirming`, …) | Progress recorded on the order |

Idempotency key: `webhook_events/np_<payment_id>_<status>`.

---

## 7. Kuma AI chat

### `POST /kuma/chat` — user
Request: `{ "message": "…", "chatRoomId": "kuma_dock" (optional), "source": "kumami-app" (optional) }` → `202 { "chatRoomId" }`
- The **user id comes from the token.** A `userId` in the body is ignored.
- Saves the message to `users/{uid}/chatrooms/{room}/messages` (`role:'user'`) and starts the n8n "Kuma AI Agent" workflow.
- The reply arrives in that same messages collection shortly after (`role:'assistant'`). **Listen with a Firestore snapshot listener.**
- Errors: `empty_message` 400 · `message_too_long` 400 (over 4000 characters) · `rate_limited` 429 (20 per minute) · `assistant_unavailable` 502 · `chat_not_configured` 503.

### `POST /kuma/callback?token=…` — n8n only
n8n posts `{ userId, chatRoomId, aiResponse }` to the `callbackUrl` it was given. `token` is an HMAC (`KUMA_CALLBACK_SECRET`) scoped to that **one user and chat room**, valid for 15 minutes; anything else gets 401. This needed no n8n change: the workflow already calls back `body.callbackUrl`.

---

## 8. Admin

| Endpoint | Auth | Does |
|---|---|---|
| `POST /admin/news/{id}/notify` | role `admin`/`superadmin`/`newsresearchadmin` | Sends one push notification to FCM topic `all-users` for a **published** news doc: `{title, body: summary}`, data `{type:'news', newsId}`. Sets `news.pushedAt`, so it sends only once. Called by the admin News publish pages. Replaces the old `notifyOnNewsPublish` function |
| `POST /api/admin/subscription` (unversioned, web admin only) | superadmin | Grant or remove Pro manually. **Remove** also cancels the user's live Stripe subscription, so billing stops |

---

## 9. Other server routes (unversioned, website-internal)

`/api/market/*` (console, onchain, flow-radar, heatmap, intelligence, watchlist, calendar, fear-greed, spot-pulse), `/api/education/progress`, `/api/portfolio-scan`, `/api/wallet-data`, `/api/wallet-profile`, `/api/intents`, `/api/tracker/bootstrap`, `/api/coingecko/*`, `/api/webhooks/alchemy`. All use the same Bearer auth (except CoinGecko). See `docs/ARCHITECTURE.md` §4a. They'll move under `/api/v1` when the app needs them.

## 10. What replaced the Firebase Functions

| Old function (`kumami-web/functions/index.js`) | Now |
|---|---|
| `/api/subscribe-checkout`, `/api/stripe/webhook` | `POST /checkout/stripe`, `POST /webhooks/stripe` |
| `/api/create-crypto-payment`, `/api/nowpayments-webhook` | `POST /checkout/crypto`, `POST /webhooks/nowpayments` |
| Referral processing inside the webhooks | `/referral/*` + the webhook transaction |
| `/api/chat`, `/api/save-chat` | `POST /kuma/chat`, `POST /kuma/callback` |
| `/api/chat-history/:userId` | Dropped: read Firestore directly |
| `notifyOnNewsPublish` (Firestore trigger) | `POST /admin/news/{id}/notify` |
| `/crypto/listings`, `prerender` | Removed (unused / CRA-only) |

## 11. Server configuration (Firebase App Hosting env / Secret Manager)

| Var | Needed by |
|---|---|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | Card checkout, webhook |
| `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_API_BASE` (sandbox: `https://api-sandbox.nowpayments.io/v1`) | Crypto |
| `KUMA_CALLBACK_SECRET` (random 32+ bytes), `N8N_CHAT_WEBHOOK_URL`, `N8N_CHAT_METHOD` (`GET` default) | Kuma chat |
| `APP_BASE_URL` (`https://kumami.world`) | Redirect and callback URLs |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | All server routes |

Stripe Dashboard setup, once per mode:
- Products: Monthly $19.99/month and Yearly $199.99/year. Copy the price ids.
- Webhook endpoint: `<APP_BASE_URL>/api/v1/webhooks/stripe` with the events in §6.
- Billing Portal: enable "update payment method".
- Retries (Settings → Billing → Subscriptions and emails): Smart Retries on, then "cancel the subscription" when all retries fail.

NOWPayments setup: create an IPN secret in the dashboard and set the payout wallet. The IPN URL is passed per invoice.

## 12. Notes for the Flutter app
- Use Firebase Auth (same project) and send the ID token on every call.
- Open checkout and update-card URLs in a browser or in-app browser tab, then poll `GET /checkout/{orderId}` or re-read `GET /me/subscription`.
- Handle the `kumami://subscribe?ref=CODE` deep link: open the subscribe screen with the code pre-filled and validate it with `GET /referral/validate`.
- Apple and Google store rules for selling digital subscriptions inside an app are the mobile team's call.
- Handover note: `docs/MOBILE_HANDOVER_Payments_Referrals.md`.
