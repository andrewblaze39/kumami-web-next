# How to test — Rachelle's v1.15 quick wins (on `dev`, 21 Oct 2026)

Five small changes from Rachelle's v1.15 request version. Each takes about a minute.

- **Pages:** `/world/onchain`, `/world/watchlist`, `/world/console`, `/world/pro?tab=digest`, `/world/pro?tab=followhub`
- **Admin (for the badge):** `/admin/pro-calendar`
- **Automated version:** `npx playwright test qa/features/v115-quick-wins.spec.ts` (QA report: `docs/qa/2026-10-21-v115-quick-wins.md`)

## Prerequisites
- `npm run dev` → http://localhost:3000 (`.env.local` points at **kumami-dev**).
- A Plus account (any signed-in user), your admin account, and a Pro account for steps 4–5.

## Step 1 — On-Chain Insights (`/world/onchain`)
1. ✅ The coin buttons are **BTC · ETH · SOL · BNB · HYPE** (no AVAX).
2. ✅ **Funding Rate** shows a small number like **+0.0080%** and, on a normal day, **NEUTRAL**. Before the fix it read about 0.8% and **Overheated Long**.
3. ✅ On **24H**, **Exchange Netflow** says “Coins leaving/arriving to exchanges · **7D (updates daily)**”.
4. Click **HYPE**. ✅ The funding, liquidations and long/short tiles fill in; Exchange Netflow says **No data** (there is no exchange-balance data for HYPE). That's expected.
5. Scroll to **Open Interest Trend**. ✅ When OI is flat and price moves, the tag reads **Trend Without Leverage** or **Decline Without Panic**, never “Stable OI” (that now only means price is flat too).
6. ✅ In **ETF Flow**, “Today” says **Not reported yet** before US ETFs report, never “$0”.

## Step 2 — Watchlist Plus (`/world/watchlist`)
1. ✅ On a normal day, no coin shows **Overheated** (the funding scale bug made it fire on normal funding).
2. ✅ **Short Heavy** only appears when funding is below −0.05% (rare).
3. ✅ The regime column can read **Coiling** when OI is rising and price is flat.

## Step 3 — Console badge (`/world/console`)
1. As admin, open `/admin/pro-calendar` and publish an event: title **[TEST] CPI**, date today, time **3 hours from now in UTC**, Impact **High**, Category **Macro**.
2. Also publish **[TEST] PPI** at 2 hours from now with Impact **Medium**.
3. As the Plus user, open `/world/console`. ✅ An amber bar at the top reads **“[TEST] CPI in 3h — expect volatility”**. The Medium event is not in it.
4. ✅ The “Needs your attention today” popup also lists **[TEST] CPI** (it covers 24h, HIGH only).
5. Click the bar. ✅ It opens the Calendar.
6. Delete both test events.

## Step 4 — Daily Digest (Pro, `/world/pro?tab=digest`)
1. ✅ The old line “Smart-money flow and a Fear & Greed read will join this digest…” is gone.
2. ✅ Three new sections at the bottom:
   - **Smart Money**: up to 3 rows like “BTC long opened · $9.1M”
   - **Also Worth Watching**: up to 5 coins with a reason
   - **Fear & Greed**: e.g. “Neutral · 51 / 100”
3. ✅ Empty sections show an honest line (e.g. “No large position opens in the last 24h.”), never “$0”.

## Step 5 — Price alerts (Pro, `/world/pro?tab=followhub`)
1. Create a price alert on **HYPE**. ✅ It shows a live price and arms.
2. Create one on **POL** (the new name of MATIC) and one on **RENDER** (was RNDR). ✅ Both show live prices.
3. ✅ An alert saved earlier on MATIC or RNDR still shows a live price (it reads POL / RENDER).
