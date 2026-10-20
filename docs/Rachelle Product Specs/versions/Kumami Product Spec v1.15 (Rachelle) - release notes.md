# Kumami World — Full Product Specification
*Every product, on every tier, the exact data source & API used, and how each result is calculated. INTERNAL reference (names the data provider) — the customer-facing product never surfaces the provider name.*
**Version 1.14** · 11 Oct 2026 · reflects the dev branch at commit 12c2b89* · see “Release notes” for what changed.*
**Contents**
Right-click and choose 'Update Field' to build the table of contents.
# **Release notes**
*What changed in each version of this document, newest first. Every entry describes how the live product changed (or how the doc was corrected to match it).*
Here's a clean rebuild. It follows the section order of Andrew's spec, with one entry per section. Logic that Plus and Pro share is written once, under the Plus section. The Pro section only lists what's different and points back to Plus.
-----
## **v1.15 — 19 Oct 2026**
*Planned — not live yet. Rachelle's logic revisions and answers to Gap Report v1.2, checked against v1.14. Everything runs on the current CoinGlass STARTUP plan (80 requests/min, smallest bar 30 min, 180 days of 1H history).*
*Section titles get one of three labels:*
  - *(Revised): the logic changes.*
  - *(Adjusted): only the status or wording changes.*
  - *(Backlog): no change now; listed so nothing from the gap report is missed.*
*Where Plus and Pro share an engine, the full logic is in the Plus section, and the Pro section lists only the differences.*
**Answers to Gap Report v1.2**
Decisions:
  - **Flow Radar Plus:** delayed 15 min for every account; Pro is real-time.
  - **Spot Pulse:** no separate Plus tab. The tile on On-Chain Insights and the Console is the Plus version; Spot Pulse Pro is the full tool.
  - **Intelligence:** dropped from Plus.
  - **Console previews:** the mockup's four panels (Spot Pulse, Flow Radar, Calendar, Watchlist) replace the written three.
  - **Watchlist:** keep the separate Signal and Status columns.
  - **Removed Pro tabs:** Smart Money Tracker cancelled (first), Coin / Token Tracker cancelled (second), Pro Fear & Greed cancelled.
  - **Calendar:** one shared calendar for Plus and Pro, confirmed. The automatic feeds stay OFF; the Calendar is manual-first.
Build order:
1.  Firestore rules to production
2.  Console scoring
3.  Flow Radar fixes
4.  On-Chain fixes
5.  Background collector
6.  Exchange Flow (Dry Powder) + cross-signal outlines on Plus
7.  AI layer
8.  Significance engine
9.  Watchlist Pro validation + 3-day Section C
10. Crypto Address Tracker
Everything marked Backlog comes after these.
-----
**KUMAMI PLUS**
**Plus §1 Console (Revised)**
  - §1.1 scoring:
      - **Fear & Greed:** 0–24 → +1.5 · 25–45 → +1 · 46–55 → 0 · 56–74 → −1 · 75–100 → −1.5.
      - **ETF flow:** the 7-day sum only counts beyond ±$100M.
      - **Funding:** \> +0.10% → −1; −0.05% to +0.10% → 0; \< −0.05% → +1.
          - Funding normally sits around +0.01% per 8h. −0.05% (≈ −55% a year) means crowded shorts, which is squeeze fuel.
          - The bearish vote stays at +0.10% even though the On-Chain label ‘Crowded Long’ starts at +0.05%. Positive funding is normal in uptrends, so the Console only votes on strong evidence.
      - **OI vs price:** up + up → +1 · up + flat → 0 · up + down → −1. v1.14 has the two middle cases swapped.
  - **Confidence** = agreeing ÷ active (non-zero) signals. v1.14 divides by all 4, which pushes readings into "Neutral · Low Signal".
  - **§1.3 HYPE chip:** confidence capped at 0.70, so it shows "Leaning …" at most. HYPE has no ETF and its futures sit mostly on Hyperliquid.
  - **§1.4:** the Flow Radar preview delay is 15 min (v1.14 text says 30).
  - **§1.5 Console badge:** a team-added HIGH event starting within 6h shows as a badge at the top ("CPI in 4h — expect volatility"). Your spec, Calendar §7.4.
  - **AI sentence under the regime:** part of the AI layer (see Platform).
**Plus §2 On-Chain Insights (Revised)**
  - **Asset switcher:** replace AVAX with HYPE. v1.14 already marks the title "(adjusted)", but nothing in the section changed.
  - **§2.1 funding bands:** \> +0.15% Overheated Long · +0.05% to +0.15% Crowded Long · −0.05% to +0.05% Neutral · −0.10% to −0.05% Crowded Short · \< −0.10% Extreme Short.
      - Remove "Mild Short Bias".
      - v1.14 has holes: +0.05% to +0.06% and 0 to −0.01% match no band.
  - **§2.2 Exchange Netflow:** the panel opens on 7D by default. The data updates once a day, so 24H usually shows ‘Updates daily’.
  - **§2.7 OI:** flat OI + price up → Trend Without Leverage (grey-green); flat OI + price down → Decline Without Panic (grey).
**Plus §2.9 Spot Pulse (Revised)** — the shared engine for the Plus tile, the Console preview and Spot Pulse Pro.
  - **Data:** three calls per coin, 1H bars, limit=2016 (84 days):
      - /api/spot/aggregated-cvd/history?exchange\_list=Binance,OKX,Coinbase,Bybit,Bitget
      - /api/futures/aggregated-cvd/history?exchange\_list=Binance,OKX,Bybit,Bitget,Hyperliquid
      - /api/futures/price/history
      - The same exchange lists for every coin.
      - Per bar, flow = taker buy − taker sell. Don't difference cum\_vol\_delta.
      - Normalise timestamps (some arrive in seconds, some in milliseconds).
      - HYPE price falls back to Hyperliquid if Binance has no HYPEUSDT pair.
  - **Flow direction:** UP or DOWN only beyond 0.5× the coin's normal swing (z-score ±0.5).
      - Normal swing = standard deviation of past windows of the same length: 4H → last 42 · 24H → last 30 · 7D → last 11.
      - Fewer than 8 past windows → "Not enough history": the tile reads BALANCED and is left out of the market verdict.
      - v1.14's "±2% of std-dev" made FLAT almost impossible.
  - **Price bands:** 4H ±0.75% · 24H ±1.5% · 7D ±4%. v1.14 uses ±1% for all three.
  - **Per-coin verdict, first match wins.** All 27 combinations are covered. r = spot share = abs(spot Δ) ÷ abs(futures Δ).
      - UP · UP · flat or down → REAL BUYING (spot-led)
      - UP · UP · UP with r \> 0.4 → REAL BUYING
      - UP · UP · UP with r ≤ 0.4 → SPECULATIVE
      - UP · FLAT · UP → SPECULATIVE
      - UP · DOWN · any → DISTRIBUTION
      - FLAT · UP · any → ACCUMULATION
      - FLAT · DOWN · any → QUIET DISTRIBUTION (new)
      - DOWN · UP · any → REVERSAL SETUP
      - DOWN · DOWN · any → COHERENT DECLINE
      - DOWN · FLAT · DOWN → FORCED DECLINE
      - Everything else → BALANCED
  - **Market verdict:** shares of tiles with data, so the same rules work for 5 and 10 tiles. Fewer than 4 tiles with data → "Not enough data". First match wins:
      - ≥ 60% bullish and ≤ 20% bearish → Broad Buying
      - ≥ 40% DISTRIBUTION + QUIET DISTRIBUTION → Distribution Wave
      - ≥ 40% COHERENT + FORCED DECLINE → Broad Selloff
      - ≥ 40% ACCUMULATION with no distribution → Selective Accumulation
      - ≥ 40% SPECULATIVE → Speculation Dominant
      - Otherwise → Mixed Market
      - Bearish states are checked before speculation. v1.14 checks speculation first.
  - **Divergence cards:** add QUIET DISTRIBUTION at +4. Everything else unchanged.
  - **Footer:** 24h spot volume = taker buy + sell volume from /api/spot/netflow-list. That endpoint is on STARTUP, so /api/spot/coins-markets isn't needed. v1.14's "Live status note" saying otherwise is wrong.
  - **Refresh:** one shared computation every 2 min. Plus reads it from a 60s cache, Pro from a 15s cache. The tile shows "Updated n min ago".
**Plus §3 Flow Radar Plus (Revised)** — the shared engine for Flow Radar Plus and Pro.
  - **Scope:** the 5 core assets, HIGH + MED events, 15-min delay for every account. Fix the leftover "30-minute delay / default 30" text.
  - **Events.** All are collected by the background collector (Platform). Each has a unique key, so the same event never appears twice.
    1.  **Whale Transfer:** /api/chain/v2/whale-transfer, every 60s, unique key = transaction hash.
          - Deposit to an exchange = Inflow (bearish). Withdrawal from an exchange = Outflow (bullish).
          - Exchange ↔ exchange and wallet ↔ wallet transfers are not counted.
          - HIGH ≥ $100M · MED $10–100M. The API's floor is $10M, so there's no LOW.
          - Coverage: no BNB Chain or Hyperliquid, so BNB and HYPE rarely show whale transfers.
    2.  **Exchange Flow → "Dry Powder" (new build):** /api/exchange/chain/tx/list for USDT and USDC, every 2 min, min\_usd=1000000.
          - Net = outflow − inflow per exchange and token over a rolling 60 min.
          - Stablecoins coming onto exchanges = Dry Powder In (bullish); going off = Dry Powder Out (bearish).
          - Other Ethereum tokens: inflow bearish, outflow bullish.
          - HIGH ≥ $500M · MED $100–500M · LOW (Pro) $25–100M.
          - One event per exchange and token per hour, updated to the latest net.
          - Market-wide: shown under every asset filter and counted in the verdict band, but not counted in any coin's Watchlist accumulation.
          - This endpoint is Ethereum-only, so it can't see native BTC/SOL/BNB/HYPE.
    3.  **Liquidation Spike:** /api/futures/liquidation/coin-list?exchange=X, one call per exchange (Binance, OKX, Bybit, Bitget, Hyperliquid), every 5 min, summed per coin. aggregated-history?exchange\_list=… is the per-coin alternative.
          - Over 70% longs = Long Flush (bearish) · under 30% = Short Squeeze (bullish) · otherwise Two-sided Flush (neutral).
          - HIGH ≥ $200M/h · MED $50–200M/h · LOW (Pro) $10–50M/h.
          - One event per coin per hour, updated to the peak.
          - v1.14 labels every liquidation "Sell Pressure".
    4.  **Smart Money:** /api/hyperliquid/whale-alert, every 60s. It returns the \~200 latest positions of $1M or more.
          - Long Opened = bullish · Short Opened = bearish · closed positions = neutral. v1.14 labels opened shorts "Accumulation", which counts as bullish.
          - Severity by size, because the API has no confidence field: HIGH ≥ $100M any coin, ≥ $25M BTC/ETH, ≥ $10M others · MED ≥ $5M BTC/ETH, ≥ $2M others · LOW (Pro) ≥ $1M.
  - **Buckets:**
    1.  Bullish: Outflow, Dry Powder In, Short Squeeze, Long Opened.
    2.  Bearish: Inflow, Dry Powder Out, Long Flush, Short Opened.
    3.  Neutral (shown but not counted): Two-sided Flush, closed positions.
  - **Verdict band, first match wins.** Dollar thresholds scale with the window: 1H ×0.5 · 4H ×1 · 24H ×2.5.
    1.  Liquidation cascade: Long Liquidation Cascade or Short Squeeze Cascade
    2.  Distribution Wave: needs bearish ≥ 1.5× bullish
    3.  Broad Accumulation: needs bullish ≥ 1.5× bearish
    4.  Mixed Flow
    5.  Quiet Flow
  - **Cross-signal outlines.** Now on Plus too; the same rules run on Pro.
    1.  Whale Outflow + Spot Pulse REAL BUYING or ACCUMULATION → green "Spot Pulse confirming".
    2.  Long Flush + Bearish regime → red "Regime confirming". Short Squeeze + Bullish regime → green.
    3.  Long Opened + 2 or more bullish whale events in 24h → green "Watchlist confirming". The bearish mirror → red.
    4.  Fallback: Outflow + Fear or Extreme Fear → green "Regime shift confirming".
  - **AI sentence under the verdict band:** part of the AI layer.
**Plus §4 Fear & Greed (Backlog)**
  - No logic change.
  - News Tone keeps using the headlines from the Intelligence engine. The Intelligence page is removed, but the engine keeps running for this.
  - News Tone moves to the AI layer: the AI classifies those same headlines, replacing today’s keyword count.
  - The history chart stays the raw index.
  - Using CoinGlass sources instead of CoinGecko/DefiLlama is accepted.
**Plus §5 Calendar (Adjusted)**
  - **Manual-first:** the automatic feeds stay OFF. The team adds macro events, token unlocks, listings and token sales / TGE days in /admin/pro-calendar.
  - **New admin categories:** Listing, Token sale / TGE.
      - A token sale needs project, ticker, date and time (UTC), venue, raise or FDV, and a link.
      - An Airdrops & Whitelist entry with a TGE or claim date appears on the Calendar automatically.
  - **Importance guide for the team:**
      - **HIGH:** CPI, PCE, NFP, FOMC decision or press conference, BoJ decision; unlocks ≥ 5% of circulating or ≥ $100M; Binance or Coinbase spot listings; tier-1 token sales.
      - **MED:** PPI, GDP, Retail Sales, ISM, JOLTS, FOMC Minutes, Fed Chair; ECB/BoE/PBoC decisions; unlocks ≥ 2% or ≥ $25M; OKX/Bybit/Upbit spot listings.
      - **LOW:** everything else.
  - **Display:** HIGH + MED by default, at most 3 events per day cell.
  - **Popups and badge:** the D-1 popup, the attention popup and the Console badge all run on team-added HIGH events.
  - **Backlog:** day/week/list view toggle; Today / This Week / Next 30D filter; "Add to my events" on the popup.
**Plus §6 Watchlist Plus (Adjusted)** — also Section A of Watchlist Pro.
  - The 5 core assets, fixed. Users can't add coins here.
  - The Signal column uses the corrected §3 directions.
  - Funding tag "Short Heavy" fires below −0.05%. v1.14 uses \< 0%, which doesn't match §1 and §2.1.
  - The regime tag reads real OI from /api/futures/open-interest/aggregated-history (already cached for §2.7), so "Coiling" can fire. v1.14 estimates OI from price, so it never does.
  - "Near Liquidation Zone" stays blocked on STARTUP.
  - **Backlog:** 7-day sparkline.
-----
**KUMAMI PRO**
**Pro §1 Daily Digest (Adjusted)**
  - Remove the outdated "once market data is live" disclaimer.
  - Add three lines:
      - Smart Money: the top 3 Hyperliquid position opens in the last 24h.
      - Watchlist: today's "Also Worth Watching" coins.
      - Today's Fear & Greed read.
**Pro §2 Following & Alerts (Adjusted)**
  - Fix the price-alert symbol list:
      - MATIC and RNDR were renamed on Binance (POL, RENDER), so those streams may no longer update.
      - HYPE, a core asset, isn't in the list.
      - Check every symbol still has a live stream.
  - **Backlog:** volume and sentiment alerts.
**Pro §3 Smart Money Tracker · §4 Coin / Token Tracker (Adjusted)**
  - Postponed, Smart Money Tracker first. Its data (/api/hyperliquid/whale-alert) is already collected for Flow Radar.
**Pro §5 Spot Pulse Pro (Revised)** — same engine as Plus §2.9.
  - 10 tiles (15s cache). Row 1 = the 5 core assets.
  - Row 2 = the 5 Watchlist Pro Section C coins.
      - Empty slots are filled with the top 24h spot-volume coins from netflow-list (excluding core assets, stablecoins and wrapped tokens), labelled "Top volume".
  - Same share-based market verdict as Plus. The separate 10-tile thresholds are dropped.
  - Fixes a contradiction in v1.14: "As built" says row 2 is live, while "What it is" says it's off until coins-markets.
**Pro §6 Security Scanner (Backlog)**
  - GoPlus integration.
**Pro §8 AI Portfolio (Backlog)**
  - Multiple wallets.
**Pro §17 Kuma AI Chat (Adjusted)**
  - Build the knowledge refresh (v1.12) from v1.15.
**Pro §18 Flow Radar Pro (Revised)** — same events, buckets, verdict band and cross-signal rules as Plus §3.
  - **Pro differences:** real-time, every coin, LOW severity, the Flow Balance panel.
  - **Illiquid filter (new):** hide events on coins with under $1M 24h spot volume (from /api/spot/netflow-list), or that are missing from that list.
      - Core assets and stablecoins are never hidden.
      - v1.14 marked this blocked, assuming /api/spot/coins-markets (Standard plan).
  - **Flow Balance:** unchanged bands, built from the corrected buckets.
  - **Netflow Flip:** unchanged.
  - **Large Limit Order:** still blocked on STARTUP.
  - **Fix text:** "Plus already ships without delay" is wrong; Plus is delayed 15 min.
  - **Significance engine:** the next big build, reusing the collector.
  - **Backlog:** "+ Custom" asset picker (up to 10) and event counts on the filter chips.
**Pro §19 Watchlist Pro (Revised)** — three sections.
  - **A:** the 5 core assets, same table as Plus §6.
  - **B:** the user's own pins, up to 15. Add-coin limits:
      - The coin needs a spot market with at least $10M 24h volume and a futures market (both from the cached netflow-lists).
      - Stablecoins, wrapped/staked tokens and the core assets can't be pinned.
      - Otherwise: "Not enough liquidity to track reliably."
  - **C, "Also Worth Watching":** up to 5 coins, 3-day net accumulation, recomputed hourly from flow\_hourly.
      - **Candidates:** coins with an event in the last 72h. Excludes core assets, the user's pins, stablecoins, wrapped tokens and Dry Powder events.
      - **A coin qualifies only if:**
          - net buying beats selling in at least 2 of the last 3 days (24h blocks);
          - 3-day net buying is above +$5M;
          - the last 24h doesn't undo more than 25% of that net;
          - spot buyers are also net positive over 3 days (net\_flow\_usd\_3d \> 0);
          - it passes the same liquidity check as B.
      - **Ranked** by days of accumulation, then net buying ÷ volume.
      - **No padding:** if fewer than 5 coins qualify, show fewer, with "Only N coins show sustained accumulation right now".
      - **Hover example:** "Accumulating 3 of 3 days · net flow +$42M·spotbuyers+$18M (3d)".
      - **Replaces the 7-day rule**, which ranked coins by days present regardless of direction.
      - **Migration:** for the first 72h, use the last 3 days of flow\_daily, labelled "building 3-day history".
  - **Backlog:** saved lists, wallet rows, 30-day signal history, alert rules, ◆ early-signal tags.
  - **Price refresh:** live prices come from Binance’s free price stream, the same one Following & Alerts uses. Coins not on Binance keep the normal refresh. CoinGlass on STARTUP can’t refresh every second.
**Pro §20 Crypto Address Tracker (Backlog)**
  - PnL, win rate, multi-chain, behaviour flags, AI read.
**Pro §21 Subscriptions & Payments (Adjusted)**
  - **Before payments go live:**
      - Deploy the v1.10/v1.14 database rules to production. They're on kumami-dev only, and kumami.world uses the production database.
      - Get CoinGlass's written approval for commercial use, or move to Standard ($299/mo). STARTUP is listed as personal use.
-----
**PLATFORM**
  - **Background collector (new):** Cloud Scheduler every 60s, calling a protected /api/v1 route with a shared-secret header, like the n8n callback.
      - Writes flow\_events (one document per event, unique key) and flow\_hourly (bullish/bearish $ per coin per hour). Both kept 7 days.
      - About 5–10 CoinGlass calls/min; a few dollars a month in database writes; 2–4 days of work.
