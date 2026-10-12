# How to test — Subscriptions, payments & referrals

_Spec: Andrew's spec v1.13 → Pro §21 Subscriptions & Payments, §22 Referral Program, §23 Backend API. Automated: `qa/features/payments-referrals.spec.ts`. API: `docs/API.md` · data: `docs/DATABASE.md`._

Everything here runs **locally against kumami-dev** (`npm run dev`, http://localhost:3000). Never use production keys or data.

## 0 · One-time setup

| What | Where | Needed for |
|---|---|---|
| `NOWPAYMENTS_IPN_SECRET` | `.env.local`. A local QA value is already there; replace it with the **sandbox** IPN secret when you have it | Crypto webhook |
| `NOWPAYMENTS_API_KEY` + `NOWPAYMENTS_API_BASE=https://api-sandbox.nowpayments.io/v1` | `.env.local` | Real crypto checkout (sandbox invoice) |
| `STRIPE_SECRET_KEY` (sk_test_…), `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | `.env.local` (Stripe Dashboard, **test mode**: create "Kumami Pro" with prices $19.99/month and $199.99/year) | Card checkout |
| Stripe CLI | `winget install Stripe.StripeCli`, then `stripe login` | Webhooks reaching localhost |
| `STRIPE_WEBHOOK_SECRET` | Run `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe` and copy the `whsec_…` it prints into `.env.local` | Card webhook |
| `KUMA_CALLBACK_SECRET` | `.env.local` (already added: a random value) | Kuma chat replies |

Restart `npm run dev` after editing `.env.local`.

## 1 · Referral code (any account)
1. Sign up a new account (or use any test account) → **Profile → Referrals** (`/world/profile?tab=referrals`).
2. ✅ You see an 8-character code (letters and digits, never 0/O/1/I/L), a link `…/world/subscribe?ref=<CODE>`, **0** friends and a **$0.00** balance.
3. Reload. ✅ The same code.
4. Firestore (kumami-dev) → `referralCodes/<CODE>`. ✅ `userId` = your uid.

## 2 · Subscribe page
1. Open the copied link in the same browser. ✅ `/world/subscribe` with the code filled in. The hint says "Code applied — you and your friend each get $10.00" (Yearly is preselected).
2. Type your **own** code. ✅ "That's your own code". Type `ZZZZZZZZ`. ✅ "That code doesn't exist", and both Pay buttons are disabled.
3. ✅ Only **Monthly $19.99** and **Yearly $199.99** (no Lifetime). The selected card has a teal outline and "✓ Selected", and the Pay buttons show the selected price.
4. Signed out: open `/world/subscribe?ref=<CODE>`. ✅ You're sent to sign in, and after logging in you land back on Subscribe with the code.

## 3 · Card payment (needs the Stripe test keys and `stripe listen` running)
Use account **B** (not Pro), with account **A**'s code.
1. Subscribe → Monthly → **Pay $19.99 with card**. ✅ The Stripe Checkout page.
2. Card `4242 4242 4242 4242`, any future date and CVC → Pay. ✅ Back on "Activating Pro…", then **"You're Pro!"** within a few seconds.
3. **Profile → Subscription.** ✅ Status Active · Plan Monthly · Paid with Card (Stripe) · "Renews on" one month from today · buttons Cancel / Update card.
4. **Referrals:**
   - B: balance **$1.00**, history "You subscribed with a friend's code +$1.00".
   - A: balance **$1.00**, **1** friend.
5. **Cancel subscription** → confirm. ✅ Status "Cancelled — ends at period end", and Resume appears. **Resume** ✅ back to "Renews on".
6. **Update card** ✅ Stripe's secure card page; after saving you return to Profile → Subscription.
7. **Replay:** in the `stripe listen` window, copy an `invoice.paid` event id → `stripe events resend <id>`. ✅ Balances stay $1.00 (Firestore `webhook_events` shows it once).
8. **Refund:** Stripe Dashboard (test) → Payments → the $19.99 payment → Refund (full). ✅ Within seconds: B is no longer Pro, both balances are **$0.00**, and the history shows two "Reversed" rows.
9. Subscribe page while Pro. ✅ The "You have Kumami Pro…" banner, and card checkout is disabled.

## 4 · Crypto payment
**With a sandbox key:** Subscribe → Yearly → **Pay with crypto**. ✅ The NOWPayments invoice page. Complete it in the sandbox. ✅ Pro until today + 365 days, and A + B each get +$10.00.

**Without a key (what QA does):** send a signed IPN to the webhook.
1. In Firestore, create `checkout_orders/test1`: `{userId: <B uid>, provider: 'crypto', plan: 'yearly', amountCents: 19999, referralCode: '<A code>', status: 'pending'}`.
2. Sign and send it (Git Bash, from the repo folder, with the dev server running):
   ```bash
   node -e "const c=require('crypto');require('@next/env').loadEnvConfig(process.cwd());const b={payment_id:9001,order_id:'test1',payment_status:'finished',price_amount:199.99,price_currency:'usd'};const s=o=>Array.isArray(o)?o.map(s):o&&typeof o=='object'?Object.fromEntries(Object.keys(o).sort().map(k=>[k,s(o[k])])):o;const sig=c.createHmac('sha512',process.env.NOWPAYMENTS_IPN_SECRET).update(JSON.stringify(s(b))).digest('hex');fetch('http://localhost:3000/api/v1/webhooks/nowpayments',{method:'POST',headers:{'content-type':'application/json','x-nowpayments-sig':sig},body:JSON.stringify(b)}).then(r=>r.json()).then(console.log)"
   ```
   ✅ `{"status":"applied","detail":"paid+referral"}`.
3. Run it again. ✅ `"status":"duplicate"`, and nothing changes.
4. B → Profile → Subscription. ✅ Paid with Crypto (NOWPayments), "Pro until" one year out, "Add more time", **no** Cancel button.
5. Change `price_amount` in the command but keep the old signature, or drop the header. ✅ `401 bad_signature`.
6. Set B's `users.proUntil` to 3 days from now. ✅ A yellow "Your Kumami Pro ends in 3 days" banner on every page, plus the reminder in Profile.

## 5 · Security spot checks
- A signed-in browser can't give itself Pro. In DevTools → Console on the site, try updating your own user doc's `proUntil`, `isPremium`, `referralBalanceCents` or `referralCode`. ✅ Permission denied. (QA probes these over REST; see the spec.)
- `curl http://localhost:3000/api/v1/me/subscription`. ✅ `401 unauthorized`.

## 6 · Kuma chat
Signed in as a Pro account, send a message in the Kuma dock. ✅ The message appears. Locally the reply **can't** come back, because n8n can't call localhost; on a deployed site the reply appears within a few seconds.

## Admin
`/admin/subscriptions` → **Remove Pro** on a card subscriber. ✅ Pro removed **and** the subscription is cancelled in the Stripe Dashboard (no more charges).
