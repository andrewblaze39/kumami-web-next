# How to test — Subscriptions (grant / remove Pro), superadmin only

Superadmins can give a user Pro for 1 month, 3 months, 12 months or with no end date, or remove it. It works on production too. Every change is recorded.

- **Where:** Admin dashboard → **Administration → Subscriptions** (`/admin/subscriptions`)
- **Automated:** `npx playwright test qa/features/access-matrix.spec.ts --project=desktop -g "Subscriptions admin tool"` — runs on qa0, a brand-new account each run (QA report: `docs/qa/2026-10-10-subscriptions-and-fixes.md`)

## Prerequisites
- A **superadmin** account (yours), and a normal test account that isn't subscribed.
- `npm run dev` → http://localhost:3000 (kumami-dev), or the deployed site.

## Step 1 — Grant
1. Open `/admin/subscriptions` as a superadmin. ✅ A user table with columns **User · Status · Ends · Granted by · Action**.
2. Search the test account's email. ✅ Status **Free**.
3. Pick **1 month** → **Grant Pro** → confirm. ✅ The message says "Pro granted to …". The row shows **Pro**, an end date about a month away, and *Granted by* = your email.
4. Sign in as the test account → workspace **Pro** → ✅ Pro tabs open (Flow Radar Pro, Watchlist Pro, Spot Pulse Pro…).

## Step 2 — Remove
1. Back in Subscriptions → **Remove Pro** → confirm. ✅ Status **Free**.
2. As the test account, reload a Pro tab. ✅ The Pro teaser shows again.

## Step 3 — Who can do it
- Sign in as a regular **admin** (not superadmin) → the **Subscriptions** item isn't in the sidebar, and opening `/admin/subscriptions` says "Only superadmins can manage subscriptions."

## Step 4 — Expiry (optional, needs a database edit)
- In Firestore (kumami-dev), set the test user's `proUntil` to a time in the past → reload as that user. ✅ Pro tabs are locked (expired grants stop automatically). The Subscriptions row shows **Pro expired**.

## Pass criteria
✅ Grant with each duration works and shows the end date · ✅ remove works · ✅ only superadmins can do it · ✅ the user's Pro access follows immediately (after a reload) · ✅ an expired grant stops Pro.

## If something's wrong
- **"Error: superadmin_only":** your account's role isn't `superadmin`.
- **The user still sees Pro after removal:** they need to reload; Pro status is read when the page loads.
