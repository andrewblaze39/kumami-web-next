# How to test — v1.20 market engines (Rachelle v1.15)

Covers everything from Rachelle's v1.15 that came after the quick wins (those are
in `../v115-quick-wins/how-to-test.md`): Flow Radar, Spot Pulse, Watchlist Pro,
Calendar, the AI layer and the background collector.

**Accounts:** a Plus account (any signed-in user, e.g. qa1) and a Pro account
(e.g. qa2). Use the local site (`npm run dev`, kumami-dev data) or a deployed dev
site. Automated: `qa/features/v115-*.spec.ts` (Flow Radar, Spot Pulse, Watchlist
Pro, Calendar, AI layer).

## 1. Flow Radar Plus — `/world/flow-radar` (Plus account)

1. The header says **Delayed 15m**. Every event is at least 15 min old, and the
   feed keeps the last 24h (it's served from stored events, not a live copy), so
   it shows events right away even after a quiet spell or a deploy. Check with
   Flow Radar Pro open in another tab: a new BTC/ETH/SOL/BNB/HYPE HIGH/MED event
   appears on Pro first and on Plus about 15 min later.
2. Event rows use the new labels:
   - **Inflow / Outflow** (whale deposits and withdrawals);
   - **Dry Powder In / Out** (stablecoins);
   - **Long Flush / Short Squeeze / Two-sided Flush** (liquidations);
   - **Long Opened / Short Opened / Position Closed** (smart money).
   - No row says "Accumulation" or "Sell Pressure" for a liquidation.
3. Pick a coin chip (e.g. ETH). Any **Dry Powder** rows stay visible, because
   they are market-wide.
4. The verdict band shows one of these:
   - Broad Accumulation
   - Distribution Wave
   - Mixed Flow
   - Quiet Flow
   - Long Liquidation Cascade / Short Squeeze Cascade

   With no filter on, the sentence under it is AI-written when the AI is
   available. Hover it and it says "Written by AI…". Turn a coin filter on and
   the plain template sentence comes back.
5. On an empty window the footer says **No events in 1H yet**, never "$0".
6. Some rows may have a green or red outline ("Spot Pulse confirming", "Regime
   confirming"…). Hover to read why.

**Quiet days:** liquidation and Dry Powder events need $50M+ / $100M+ (MED), so
the feed can be thin. Check the time and the market before calling it a bug.

## 2. Flow Radar Pro — `/world/pro?tab=flowradar` (Pro account)

1. The feed is real-time (no "Delayed" chip). The LOW severity and **7D** window
   are available, plus the **Netflow Flip** type chip.
2. The Flow Balance panel shows a 24h bull/bear split.
3. Coins are shown only if they have ≥ $1M of daily spot volume. The core coins
   and stablecoins are always shown.

## 3. Spot Pulse — `/world/onchain` (Plus) and `/world/pro?tab=spotpulse` (Pro)

1. Plus: 5 tiles (BTC, ETH, SOL, BNB, HYPE). Each tile shows a verdict, price
   and 24h spot volume. The panel shows "Updated n min ago".
2. Switch 4H / 24H / 7D. Verdicts can include **QUIET DISTRIBUTION**. A brand-new
   coin says **NOT ENOUGH HISTORY**.
3. Market banner: Broad Buying / Distribution Wave / Broad Selloff / Selective
   Accumulation / Speculation Dominant / Mixed Market (or "Not enough data").
4. Pro: 10 tiles. Row 2 = "Also Worth Watching" coins, or tiles labelled **Top
   volume**.

## 4. Watchlist Pro — `/world/pro?tab=watchlist` (Pro account)

1. Pin these and check the result:
   - **USDC** → "Stablecoins and wrapped tokens can't be pinned."
   - **BTC** → "BTC is a core asset — it's always in Section A."
   - **ZZZQ** → "Not enough liquidity to track reliably."
   - **PEPE** → pinned, counter reads "1/15 assets tracked".

   Remove it again afterwards.
2. "Also Worth Watching" is labelled **3-day net accumulation**. Hovering ◆ shows
   "Accumulating 3 of 3 days · net flow +$…M · spot buyers +$…M (3d)". If fewer
   than 5 coins qualify, it says "Only N coins show sustained accumulation right
   now".
3. Prices tick live on every row.

## 5. Calendar — admin change (superadmin, then Plus and Pro)

1. Go to `/admin/pro-calendar`. The category list has **Listing** and **Token
   sale / TGE**.
2. Try publishing a Token sale without a venue. It's refused and the missing
   fields are named. The importance guide is shown in the form.
3. Publish a `[TEST]` token sale with venue, raise and link. As Plus, it shows on
   `/world/calendar` with venue / raise / link in the tooltip.
4. Go to `/admin/pro-airdrops` and give a `[TEST]` airdrop a TGE date.
   - As **Pro**: "{name} — Airdrop TGE / claim" (MED) shows on that day.
   - As **Plus**: it does **not** show. Airdrops are Pro-only until Rachelle
     decides.
5. By default HIGH + MED events show. Tap **LOW** to see low-impact events.
6. Delete the `[TEST]` items.

## 6. AI layer

1. On the Console, the text under "Global Regime" is two short sentences. Hover:
   "Written by AI…".
2. Fear & Greed → News Tone source line: "AI-scored headlines" (or "Keyword
   estimate" when the AI is off).
3. **If you only see template text:** the Gemini key is on Google's free tier (20
   calls/day). After a quota error the AI pauses for hours (server log line
   `[ai] … pausing AI calls`). That's expected until billing is enabled.

## 7. Background collector (after setup)

Setup first: `CRON_SECRET` plus a Cloud Scheduler job (see `docs/API.md`).

1. `POST /api/v1/cron/collect` without the header → 401. With
   `x-cron-secret: <secret>` → `{ events, created, updated, hourly, deleted, ms }`.
2. Firestore `flow_events` and `flow_hourly` fill up. Running it twice adds no
   duplicates.
3. After 72h of `flow_hourly`, Watchlist Pro's Section C stops saying "building
   3-day history".
