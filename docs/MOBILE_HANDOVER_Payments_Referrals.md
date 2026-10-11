# Mobile handover — Payments, Referrals & Kuma chat (11 Oct 2026)

For the Flutter app. Full contract: **`docs/API.md`**; data: **`docs/DATABASE.md`**. Spec: Andrew's spec v1.13, Pro §17 and §21–23.

## What changed
- The old Firebase Functions endpoints (`api-…run.app/api/subscribe-checkout`, `/api/create-crypto-payment`, `/api/chat`, `/api/save-chat`) are being **switched off**. Use `https://kumami.world/api/v1/...` instead.
- Every call sends `Authorization: Bearer <Firebase ID token>`. The server takes the user from the token and **ignores any `userId` in the body**.
- **Pro status:**
  - Pro is still `users/{uid}.isPremium` plus `proUntil`: Pro = `isPremium && (proUntil == null || proUntil > now)`.
  - Easier: call `GET /api/v1/me/subscription`.
  - The app **must not write** any billing or referral field. The Firestore rules now reject it.

## Screens to build
1. **Subscribe:**
   - `GET /plans` for the prices.
   - Referral box, checked with `GET /referral/validate?code=`.
   - **Card** → `POST /checkout/stripe` → open `url` in a browser.
   - **Crypto** → `POST /checkout/crypto` → open `invoiceUrl`.
   - Then poll `GET /checkout/{orderId}` until `status == 'paid'`.
2. **My subscription:**
   - `GET /me/subscription`.
   - Buttons: Cancel (`POST /subscription/cancel`), Resume (`/resume`), Update card (`/payment-method` → open `url`).
   - Show `periodEnd` as the date. When `showRenewReminder` is true, show "your crypto Pro ends soon — extend".
3. **Referrals:** `GET /referral/me` for the code, share link, count, `balanceCents` and history. Withdrawals aren't available yet.
4. **Deep link** `kumami://subscribe?ref=CODE`: open Subscribe with the code filled in.
5. **Sign-up:** after creating the user doc, call `GET /referral/me` once, so the account gets its code.
6. **Kuma chat:**
   - `POST /kuma/chat {message, chatRoomId}` returns 202.
   - The reply appears in `users/{uid}/chatrooms/{chatRoomId}/messages` (`role: 'assistant'`). Use a snapshot listener.
7. **News push:** published news is sent to FCM topic **`all-users`** (`data.type = 'news'`, `data.newsId`). Subscribe the app to that topic.

## Error handling
Errors come back as `{error:{code,message}}`. Codes to handle:
- `already_subscribed`: show "Manage subscription".
- `invalid_referral_code`.
- `billing_not_configured`: payments are off on that server.
- `rate_limited`.
- `unauthorized`: refresh the token and retry once.

## Store rules
Apple and Google may require their own in-app purchase for digital subscriptions sold inside the app. That's the mobile team's decision; these endpoints cover web-style checkout.
