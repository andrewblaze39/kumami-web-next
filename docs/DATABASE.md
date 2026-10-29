# Kumami — Firestore Database Reference

_Last updated: 14 Oct 2026 · Andrew's spec v1.16 · branch `dev`_
_Companion docs: [`docs/API.md`](API.md) (which endpoint writes what) · [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) · `firestore.rules`_

One Firestore database per Firebase project: **`kumami-dev`** (local dev and QA) and **`kumami-6df47`** (production).
The website and the Flutter app share it.

**Who may write.**
- **Server** means the Next.js `/api/*` routes, using the Firebase Admin SDK. The Admin SDK bypasses the rules.
- **Admin page** means the `/admin` dashboard writing from the browser, as an admin.
- **Owner** means the signed-in user writing their own document from the app.
- Anything not listed as writable is denied by `firestore.rules` (the default is deny-all).

**Conventions.**
- Money is always **integer US cents**: `amountCents`, `referralBalanceCents`.
- Times are Firestore Timestamps.
- Ids that come from a payment provider are made safe for document ids by `safeId()`, which replaces anything that isn't `[A-Za-z0-9_-]` with `_`.

---

## 1. Accounts

### `users/{uid}` — one per account
| Field | Type | Written by | Meaning |
|---|---|---|---|
| `email`, `createdAt` | string, ts | Owner (sign-up) | — |
| `displayName` | string | Owner (sign-up, Profile → Name) | Name shown in the shell |
| `role` | `user`·`admin`·`superadmin`·`newsresearchadmin`·`newsdrafter`·`marketanalysisadmin` | Superadmin (Role Management) | Admin access. **Never** grants Pro |
| `isAdmin` | bool | — (legacy) | Old flag; check `role` |
| `isPremium` | bool | **Server** | Pro switch. Pro = `isPremium && (proUntil == null \|\| proUntil > now)` (`src/lib/pro.ts`, mirrored in the rules) |
| `proUntil` | ts \| null | **Server** | When Pro ends. Card: period end + 3-day grace. Crypto: prepaid end. Admin: chosen date, or null = no end |
| `proSource` | `stripe`·`crypto`·`admin` | **Server** | What granted the current Pro |
| `plan` | `monthly`·`yearly` | **Server** | Card: the subscribed plan. Crypto: the plan bought last |
| `subscriptionStatus` | `active`·`canceling`·`past_due`·`canceled`·`expired` (+ legacy `cancelled-immediate` from the admin tool) | **Server** | Shown in Profile → Subscription |
| `cancelAtPeriodEnd` | bool | **Server** (Stripe webhook) | The card subscription won't renew |
| `stripeCustomerId`, `stripeSubscriptionId` | string | **Server** | Links to Stripe |
| `firstPaidAt` | ts | **Server** (first paid payment) | Marks "already paid once", which drives the one-time referral reward |
| `referralCode` | string (8 chars) | **Server** (`GET /api/v1/referral/me`) | The user's own code. Mirrors `referralCodes/{code}` |
| `referralBalanceCents` | int | **Server** (payment webhooks) | Always equals the sum of the user's `referral_ledger` rows. Can go negative after a reversal |
| `referralCount` | int | **Server** | Friends who paid with this user's code (net of reversals) |
| `referredBy` | uid | **Server** | Who referred this user, set on the rewarded payment |
| `proGrantedBy/At`, `proRemovedBy/At` | string, ts | **Server** (`/api/admin/subscription`) | Audit of manual grants |
| `activeChatRoomId` | string | **Server** (`/api/v1/kuma/chat`) | Fallback chat room |
| `cryptoPortfolio`, `lastPortfolioScan` | object | Owner | Legacy Pro dashboard portfolio and AI scan cache |
| _Retired (no longer written):_ `subscriptionId`, `subscriptionPlan`, `subscriptionStartDate`, `subscriptionEndDate`, `paymentMethod`, `referralRewards`, `subscribedAt` | | | CRA / Firebase Functions era |

**Rules:**
- The owner may change **only** `displayName`, `photoURL`, `email`, `createdAt`, `updatedAt`, `cryptoPortfolio` and `lastPortfolioScan`.
- A superadmin may change another user's `role`.
- Everything else is server-only.

### Subcollections of `users/{uid}`
| Path | Written by | Contents |
|---|---|---|
| `education_progress/{level}` | Owner (via `/api/education/progress` and the client) | Per-level completed sections and notes |
| `pro/state` | Owner (Pro tabs) | Following, AI Portfolio holdings, Pro UI state. Its `alerts` field is legacy: since v1.18 alerts live in `price_alerts/{uid}` (imported on first use) |
| `chatrooms/{roomId}` | Server + Owner | `chatRoomId`, `name`, `icon`, `type`, `createdAt`, `updatedAt` |
| `chatrooms/{roomId}/messages/{id}` | **Server** (`/api/v1/kuma/chat` = `role:'user'`; `/api/v1/kuma/callback` = `role:'assistant'`) | `role`, `message`, `timestamp`, optional `buttons` |
| `watchlist/{id}` | Owner (Address Tracker) | Tracked wallets: `address`, `label`, `chains`, `minUsd`, `muteUntil` |

### `user_prefs/{uid}`
Written by the owner. Fields: `mode` (`beginner`·`advanced`·`pro`) and `kumaWidth`.

### Account deletion (spec v1.16 Basic §8)
`DELETE /api/v1/me` (`src/lib/account/`) removes everything personal and keeps the money records:
| Deleted | Kept (uid only, tax/accounting) |
|---|---|
| `users/{uid}` + all subcollections, `user_prefs/{uid}`, `watchlists/{uid}`, `alerts` (by `userId`), `referralCodes` (by `userId`), the Auth user | `payments`, `checkout_orders`, `subscriptions`, `webhook_events`, `referral_rewards`, `referral_ledger`, `admin_audit` |

**Never recreate a deleted user.** Server writers must not merge into a `users/{uid}` that no longer exists: the Stripe webhook still records a late payment but skips the user fields; a referral reward is skipped (`payer_missing`); a reversal still writes the ledger rows but no balance on a missing user; the Kuma callback returns 404. As a result, the "balance == Σ ledger" invariant holds only for users that still exist.

---

## 2. Payments & subscriptions (spec v1.13 Pro §21)

### `checkout_orders/{orderId}` — one per checkout started
Created by `POST /api/v1/checkout/stripe` or `POST /api/v1/checkout/crypto`. Updated by the webhooks. The owner can read it; nobody writes it from a client.
| Field | Meaning |
|---|---|
| `userId`, `provider` (`stripe`·`crypto`), `plan`, `amountCents`, `currency` (`usd`) | What was ordered |
| `referralCode` | Normalised code entered at checkout, or null |
| `status` | `pending` → `paid`. Crypto may also be `partially_paid`, `review` (amount mismatch), `failed`, `expired` or `refunded` |
| `providerRef` | Stripe subscription id / NOWPayments invoice id |
| `stripeSessionId`, `invoiceUrl` | Provider session |
| `lastStatus`, `lastStatusAt`, `nowPaymentsPaymentId` | Last crypto progress status |
| `paymentId`, `paidAt` | The `payments` doc that paid it |
| `createdAt` | — |

### `payments/{paymentId}` — one per successful charge
Id: `stripe_<invoiceId>` or `np_<payment_id>`. Written by the **webhooks only**. The owner can read it.
| Field | Meaning |
|---|---|
| `userId`, `provider`, `plan`, `amountCents`, `currency`, `orderId` | — |
| `periodStart`, `periodEnd` | The access period this payment covers |
| `isFirstPayment` | The user's first ever paid payment (the referral trigger) |
| `status` | `paid` · `partially_refunded` · `refunded` · `disputed` |
| `refundedCents`, `refundedAt`, `disputedAt` | — |
| `stripeInvoiceId`, `stripePaymentIntentId`, `stripeSubscriptionId`, `billingReason` | Card |
| `nowPaymentsPaymentId`, `nowPaymentsInvoiceId`, `payCurrency`, `actuallyPaid` | Crypto |
| `referralRewardId`, `referralResult` | `credited`, or why not (`no_code`, `already_rewarded`, `not_first_payment`, `own_code`, `unknown_code`, …) |

### `subscriptions/{id}`
| Kind | Id | Written by | Fields |
|---|---|---|---|
| Card | Stripe subscription id | Stripe webhook (mirror of Stripe) | `userId`, `provider:'stripe'`, `plan`, `status` (Stripe's), `cancelAtPeriodEnd`, `currentPeriodStart/End`, `endedAt`, `stripeCustomerId`, `updatedAt` |
| Crypto | `crypto_<orderId>` | NOWPayments webhook | `userId`, `provider:'crypto'`, `plan`, `status:'paid'`, `currentPeriodStart/End` |
| Admin grant | auto id | `/api/admin/subscription` | `planId:'pro-manual'`, `status`, `startDate`, `endDate`, `source:'admin'`, `grantedBy` |

The owner can read these. Admins may update or delete them.

### `webhook_events/{provider_eventId}` — idempotency log
Id: `stripe_<event id>` or `np_<payment_id>_<status>`. Fields: `provider`, `type`, `result`, `processedAt`, and `orderId`/`paymentId` for crypto.
It's written **in the same transaction** as the change it records. An event whose doc already exists is skipped, so a resent webhook is never applied twice. Server-only; no client access.

### Retired
`pendingCryptoPayments` (replaced by `checkout_orders`) and `referrals` (replaced by `referral_rewards`). They're closed to clients and no longer written.

---

## 3. Referral program (spec v1.13 Pro §22)

### `referralCodes/{code}`
Fields: `code`, `userId` (owner), `createdAt`, `usageCount`.
Created by `GET /api/v1/referral/me` in a transaction. The code must not already exist, so codes are unique. **No client access at all**: validation goes through `GET /api/v1/referral/validate`, so code owners can't be listed.

### `referral_rewards/{refereeUid}` — at most ONE per new user, ever
Fields:
- `referrerId`, `refereeId`, `code`, `plan`, `paymentId`;
- `rewardCentsEach`: 100 (monthly) or 1000 (yearly);
- `status`: `credited` or `reversed`;
- `createdAt`, `reversedAt`, `reversalReason` (`refund` or `dispute`).

The doc id being the new user's uid is what guarantees the reward is paid only once. Either party can read it.

### `referral_ledger/{entryId}` — every balance change
Ids:
- `<refereeUid>_referrer` and `<refereeUid>_referee` (the credit);
- `…_referrer_reversal` and `…_referee_reversal` (a refund);
- later, `withdrawal` rows.

Fields: `userId` (whose balance), `amountCents` (+/-), `type` (`referral_referrer`·`referral_referee`·`reversal`), `rewardId`, `otherUserId`, `reason`, `createdAt`.
The owner can read their own rows.

**Invariant:** `users.referralBalanceCents == Σ referral_ledger.amountCents` for that user. It's checked by unit tests and by QA.

---

## 4. Content (admin-authored)

`status` is `published` or `draft`. Drafts are hidden from users. Since v1.18 the long text fields (summaries, descriptions, bodies, Kumami Insight, Kumami Research call / "what this means", airdrop and calendar descriptions, education blurb) may hold rich-text markers `**bold**` `*italic*` `__underline__` and `• ` bullet lines (`lib/richText.ts`); apps should render them or strip them for previews. Plain text stays valid.

| Collection | Written by (admin page) | Read by | Key fields |
|---|---|---|---|
| `news` | `/admin/news` (+ drafts, edit) | News Portal, Home | `title`, `summary`, `content`, `category`, `imageUrl`, `author`, `isPremium`, `tags`, `kumamiInsight`, `status`, `timestamp`, `likes`, `readTime`, **`pushedAt`** (set by `/api/v1/admin/news/{id}/notify`) |
| `blogs` | `/admin/blog` | Blogs, Home | `title`, `content`, `summary`, `author`, `readTime`, `thumbnailImageUrl`, `detailImageUrl`, `status`, `timestamp` |
| `research_articles` | `/admin/research` | Tokenpedia | `title`, `author`, `category`, sections, images, `status` |
| `education_articles` | `/admin/education` | Education | `title`, `level`, `chapterIndex`, `sections`, `status` |
| `ai_modules` | `/admin` AI modules | AI Labs | `title`, `level`, `sections`, `status` |
| `games`, `gameDropdownOptions` | `/admin/games` | Games | `title`, `genres`, `networks`, `platformType`, `categories`, images, `status` |
| `partner_articles`, `all_partners`, `homepage_partners` | `/admin` Partners | Partners, Home | `name`, `logoUrl`, `link`, … |
| `youtube_shorts` | `/admin` | News grid | `videoId`, `title`, `order`, `isActive` |
| `marketAnalysis` | `/admin/market-analysis` | Pro → Market Analysis | `title`, `content`, `imageUrl`, `createdAt` |
| `alphaRoom` | `/admin/alpha-room` | Pro → Alpha Room | `message`, `role`, `timestamp`, `buttons` |
| `pro_news`, `pro_research`, `pro_airdrops`, `pro_events`, `pro_calendar` | `/admin/pro-*` | Pro tabs, the shared Calendar | See Andrew's spec Pro §7, §10, §13–15. Pro-only reads (rules: `pro_*` wildcard) |
| `pro_events/{id}/questions` | Pro users (ask, upvote) | Events | `text`, `votes`, `userId` |
| `pro_calendar` (v1.18 fields) | `/admin/pro-calendar` | `/api/market/calendar` | `audience: { plus, pro }` — "Plus and Pro" `{true,true}` or "Pro only" `{false,true}`; missing on older docs = both. New docs have no `cat` (the Category control was removed); older docs keep theirs |
| `pro_settings/calendar` | `/admin/pro-calendar` | `/api/market/calendar` | Feed switches |
| `app_config/about_us`, `app_config/terms_and_conditions` | `/admin` | About, Terms | Page content (the Terms text is supplied by Andrew's team; `/terms` and `/world/terms` render it) |

---

## 5. Market data (server cache)

| Collection | Written by | Contents |
|---|---|---|
| `market_cache/{key}` | `/api/market/*` routes | `{ value, updatedAt }`. Shared TTL cache of CoinGlass/CoinGecko responses, 2–30 minutes |
| `flow_daily/{yyyy-mm-dd}` | `/api/market/flow-radar`, `/api/v1/cron/collect` | Daily Flow Radar tally per coin: event counts, `maxUsd`, and (from v1.15) `bullishUsd` / `bearishUsd` |
| `flow_events/{eventKey}` | `/api/v1/cron/collect`, and `/api/market/console` + `/api/market/flow-radar` as a backup (one run per minute across servers) | One doc per Flow Radar event (the event fields + `counted`, `firstSeen`, `lastSeen`, `expireAt` = event time + 7 days, and `plusAt` (ms) on events Flow Radar Plus may show: 5 core coins or market-wide, HIGH/MED, the 4 Plus types). Key = event id (tx hash, coin+hour, exchange+token+hour). Flow Radar Plus and the Console preview read the last 24h with `plusAt` ≤ now − 15 min (the 15-minute delay, 22 Oct 2026; replaced `flow_snapshots`) |
| `fear_greed_daily/{yyyy-mm-dd}` | `/api/v1/cron/collect` (v1.18) | `{ date, score, label, color, savedAt }` — Kumami's Fear & Greed score, once per UTC day; never written when the index is unavailable. The Fear & Greed chart shows it once 30 days exist ("Market index" until then) |
| `price_alerts/{uid}` | `/api/v1/me/alerts`, `/api/v1/cron/collect` (v1.18) | `{ uid, active, alerts: AlertDef[], state: { [id]: AlertState }, skippedLegacy, updatedAt, checkedAt }` — a Pro user's price alerts (see API.md §7) |
| `flow_meta/collector` | collector runs | `{ lastRun, since }` (ms): last run (cron or page) and the first run ever; page runs skip if any run was under 50 s ago |
| `flow_hourly/{yyyy-mm-ddTHH}_{COIN}` | `/api/v1/cron/collect` | `{ hour, asset, bullishUsd, bearishUsd, expireAt }` — bullish/bearish $ per coin per hour (Dry Powder and neutral events excluded). Read by Watchlist Pro Section C / Spot Pulse Pro row 2 (`pickSectionC`) once 72h exist |
| `watchlists/{uid}` | `/api/market/watchlist` | `{ symbols }` (Watchlist Pro pins) |
| `alerts/{id}` | `/api/webhooks/alchemy` | Wallet activity alerts |
| `whales/{id}` | Admin | Tracked whale wallets |

Server-only: no Firestore rule allows clients to read or write the `flow_*`, `fear_greed_daily` or `price_alerts` collections (Admin SDK only). Old `flow_snapshots` docs (the pre-22 Oct Plus delay) are no longer written or read and can be deleted. Retention: the collector deletes docs past `expireAt`; also add a Firestore **TTL policy** on `expireAt` for `flow_events` and `flow_hourly` (Console → Firestore → TTL) so nothing outlives 7 days if the collector stops.

## 6. Admin

| Collection | Written by | Contents |
|---|---|---|
| `notifications/{id}` | `/api/v1/cron/collect` (price alerts, v1.18) | `{ userId, kind: 'price_alert', alertId, title, message, read, createdAt, timestamp }`. Users read / update their own (existing rule); the shell shows new ones as a toast + browser notification |
| `admin_audit/{id}` | `/api/admin/subscription` | `type`, `action` (grant/remove), `months`, `targetUid`, `targetEmail`, `by`, `at` |

---

## Keeping this current
Update this file in the same commit as any change to a collection or field: new, renamed or retired. The `api-db-docs` skill (`.claude/skills/api-db-docs/`) is the checklist, and workflow stage 6 runs it.
