# How to test — Plus vs Pro tools (Flow Radar, Watchlist, Spot Pulse) and Pro access

Each market tool has a cut-down **Plus** version and a complete **Pro** version. **Pro means subscribed**: admin roles don't unlock Pro.

- **Automated:** `npx playwright test qa/features/access-matrix.spec.ts qa/features/plus-pro-tools.spec.ts` (QA report: `docs/qa/2026-10-10-plus-pro-tool-split.md`). The QA run creates its own fresh accounts and deletes them afterwards.

## Prerequisites
- `npm run dev` → http://localhost:3000 (kumami-dev).
- Two accounts: one **free** account, plus your own account. Use the temporary **Grant Pro / Remove Pro** buttons (Profile → Subscription) to switch your account between subscribed and not subscribed. They do what a real subscription will do. ⚠️ These buttons are for testing only and get removed before release.

## Step 1 — Not subscribed (free account, or your account after "Remove Pro")
1. Workspace **Plus**. ✅ The sidebar shows **Flow Radar Plus** and **Watchlist Plus**.
2. **Flow Radar Plus:** ✅ title "Flow Radar Plus", a **"Delayed 15m"** chip, only BTC/ETH/SOL/BNB/HYPE events, no **LOW** filter, no "Flow balance" panel. Right after a server start it may say "The 15-minute delayed feed is starting".
3. **Watchlist Plus:** ✅ exactly 5 rows (BTC, ETH, SOL, BNB, HYPE), no "Add a ticker" box, no "Also Worth Watching", and an **Open Watchlist Pro** button.
4. **On-Chain Insights:** ✅ the Spot Pulse panel has 5 tiles, **no "15-min delayed" text**, and an **Unlock Spot Pulse Pro →** link.
5. Workspace **Pro** → open **any** Pro tab (e.g. `/world/pro?tab=flowradar`, `?tab=watchlist`, `?tab=spotpulse`, `?tab=research`). ✅ You always see the **Pro teaser**, never Pro content. Even an **admin** account sees the teaser if it isn't subscribed.

## Step 2 — Subscribed (Profile → Subscription → **Grant Pro**)
1. Workspace **Pro** → **Tools**. ✅ It lists **Flow Radar Pro, Watchlist Pro, Spot Pulse Pro**, then Security Scanner, Market Cap Comparison, Airdrops & Whitelist.
2. **Flow Radar Pro:** ✅ "Live" (no delay chip), a **LOW** filter, the **Flow balance** panel, and coins beyond the 5 majors.
3. **Watchlist Pro:** ✅ the 5 anchors, then **Your Watchlist**: type `DOGE` and click **Pin** → "1/15 assets tracked"; remove it (desktop: **Remove**; phone: **×** next to the coin) → "0/15". Then **Also Worth Watching** shows up to 5 extra coins, never the anchors, your pins or stablecoins, labelled "In Flow Radar n of the last 7 days" or "building 7-day history (n/7 days)".
4. **Spot Pulse Pro:** ✅ up to **10 tiles** (the 5 anchors first, then the extra coins), no "delayed" text, and the footer says where row 2 comes from. 4H / 24H / 7D all show tiles. On 7D, BTC/ETH/SOL/BNB must be there (that was a bug).
5. Go back to the **Plus** workspace → Flow Radar Plus / Watchlist Plus. ✅ Still the **Plus** versions (Plus pages are Plus for everyone).

## Step 3 — Remove Pro
Profile → Subscription → **Remove Pro** → reload → ✅ every Pro tab shows the teaser again.

## Pass criteria
✅ Non-subscribers (admins included) never see Pro content or Pro data · ✅ subscribers see all three Pro tools under Tools · ✅ Plus pages show the Plus versions for every account · ✅ no red console errors.

## If something's wrong
- **A Pro tab shows content for a non-subscriber:** check `isPremium` in `WorldProContent.tsx` and `resolveTier` in `src/lib/market/gating.ts`. Both must depend on the subscription only.
- **Spot Pulse Pro shows only 5 tiles:** row 2 comes from `pickExtraCoins` (`src/lib/market/consistentCoins.ts`). Check `flow_daily` has data and the Flow Radar buffer loads.
