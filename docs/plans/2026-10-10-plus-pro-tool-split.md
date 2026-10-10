# Plan — Plus/Pro tool split: Flow Radar, Watchlist, Spot Pulse

**Source:** Andrew's spec v1.6, the "Planned changes (v1.6)" sub-sections in Plus §2, §3, §6 and Pro §5, §18, §19 ← Andrew's clarified decisions (10 Oct 2026) + Rachelle *Kumami Website (6)*, Kumami Pro brief ("5 fixed + 5 consistent spikes"; "Spot Pulse takes the tokens that enter the watchlist").

## Goal
Each of the three tools exists in two clearly named versions. **Plus** is a cut-down version: Flow Radar Plus is delayed 15 minutes, Watchlist Plus shows the 5 fixed coins, and Spot Pulse is a tile inside On-Chain Insights. **Pro** is the complete, real-time version: Flow Radar Pro, Watchlist Pro and Spot Pulse Pro, each with its own Pro sidebar entry under Tools. Plus pages behave as Plus for every account.

## Feasibility (probed 10 Oct 2026, STARTUP plan)
| Need | Source | Result |
|---|---|---|
| Spot Pulse data for non-anchor coins (spot CVD, futures CVD, price) | `/api/spot/aggregated-cvd/history`, `/api/futures/aggregated-cvd/history`, `/api/futures/price/history` | ✅ code 0 for DOGE, LINK, SUI, PENDLE, TAO |
| Flow Radar events | existing buffer (whale-transfer, netflow-list, liquidation coin-list, hyperliquid whale-alert) | ✅ already live |
| Trending-by-volume coins | `/api/spot/coins-markets` | 🔒 locked — not needed (we use Watchlist Pro's extra coins) |

## Key findings that shape the design
1. **The current Plus delay can't work.** Netflow-flip and liquidation events are stamped with the fetch time on every 60-second rebuild, so the "hide events newer than 30 min" filter removes them all. Plus effectively saw whale/smart-money events only, which is why the Console's Flow Radar panel was empty. **Fix:** store a snapshot of the feed every minute; Plus reads the snapshot from 15 minutes ago.
2. **"7-day consistency" needs history**, and there are no scheduled jobs. **Fix:** record a daily per-coin tally whenever the Flow Radar buffer refreshes (throttled to one write per 10 minutes). Days nobody opens the site leave gaps; acceptable on dev, noted as a known gap.
3. The **Spot Pulse "15-min delayed" label is hardcoded** for everyone and isn't true for any tier. Remove it.

## Design
**One component per tool, two variants.**
- `FlowRadarView({ variant })` and `WatchlistView({ variant })` are moved out of the Plus pages into `src/components/world/tools/`.
- Plus pages render `variant="plus"`.
- The Pro tabs (`/world/pro?tab=flowradar`, `?tab=watchlist`, existing `?tab=spotpulse`) render `variant="pro"`.
- The page title shows the variant name ("Flow Radar Plus" / "Flow Radar Pro").

**Server enforces the variant.**
- APIs take `?view=plus|pro`. Effective tier = `pro` only if `view=pro` **and** the account is Pro, otherwise `free`. Plus pages always send `view=plus`.

**Flow Radar delay (snapshots).**
- New `src/lib/market/flowSnapshots.ts`. On each buffer refresh, write `flow_snapshots/{minuteBucket}` (Firestore, admin SDK) and delete snapshots older than 60 minutes (best effort).
- Plus reads the newest snapshot that is at least 15 minutes old, falling back up to 10 minutes further back. If none exists (cold start), it shows an honest "Delayed feed is starting — check back in a few minutes" state.
- The Console (a Plus page) uses the same delayed snapshot for its Flow Radar preview.
- `FREE_TIER_DELAY_MINUTES` default becomes 15.

**7-day history.**
- New `src/lib/market/flowHistory.ts`. It records `flow_daily/{YYYY-MM-DD}` with `assets.{SYM} = { maxEvents, maxUsd, high, bullish, bearish }`, read-modify-write, throttled.
- Pure rule `src/lib/market/rules/consistentFlow.ts`: given the last 7 daily docs and an exclude list (anchors + user's pins), rank coins by days present (≥ 1 HIGH/MED event that day), then by total USD, and take the top 5. Returns `{ assets, daysOfHistory }`.

**Watchlist Pro.**
- Section C = `consistentFlow` once 7 days of history exist. Otherwise it uses the current `computeSectionC` (24h) with a "building history (n/7 days)" label. Row reasons say "In Flow Radar 6 of the last 7 days" etc.

**Spot Pulse Pro.**
- `makeSpotPulseLive('pro', tf, extraAssets)`, where `extraAssets` = the global top-5 consistent coins (anchors excluded, not per-user pins, so one cached payload serves all Pro users). That gives 10 tiles, and `computeMarketVerdict('pro')` (10-tile thresholds) is used when there are ≥ 10 tiles. Cache 15s.
- Tiles with no data show "No data", never fake values.

**Sidebar.**
- Plus: "Flow Radar Plus", "Watchlist Plus".
- Pro → Tools: Flow Radar Pro, Watchlist Pro, Spot Pulse Pro, Security Scanner, Market Cap Comparison, Airdrops & Whitelist.

**Spot Pulse tile (Plus).** Keep the "Spot Pulse" title, remove the delay label, add an "Unlock Spot Pulse Pro →" link.

## Steps (each a commit on `feat/plus-pro-tool-split`)
1. `consistentFlow` rule + unit tests; `flowHistory` recorder; `flowSnapshots` store + reader.
2. Flow Radar API: `view` param, snapshot-based 15-min delay for Plus, history recording. Console API uses the Plus snapshot.
3. `FlowRadarView` variant component; Plus page + new Pro tab; titles.
4. Watchlist API `view` param + Section C 7-day rule with fallback; `WatchlistView` variant component; Plus page + new Pro tab; revert the account-based gating.
5. Spot Pulse: extra assets for Pro, 10-tile verdict, Pro tab full page, remove delay label, Plus tile upsell link.
6. Sidebar labels and Pro Tools group; `WorldProContent` tab keys + tours; Daily Digest links if any.
7. Checks → QA → docs (ship mode, gap report) → merge into `dev` → push.

## Files to touch
`src/app/api/market/{flow-radar,watchlist,spot-pulse,console}/route.ts`, `src/lib/market/{gating.ts,flowSnapshots.ts,flowHistory.ts}`, `src/lib/market/rules/consistentFlow.ts` (+ test), `src/lib/market/live/spotPulse.ts`, `src/components/world/tools/{FlowRadarView,WatchlistView}.tsx` (new, moved from pages), `src/app/world/(app)/{flow-radar,watchlist}/page.tsx`, `src/components/world/pro/WorldProContent.tsx`, `src/components/world/shell/Sidebar.tsx`, `src/components/world/panels/{SpotPulse,SpotPulsePreview}.tsx`, `src/contexts/WorldModeContext.tsx` (unchanged routes; verify).

## Tests to add
- `consistentFlow`: ranking by days present, USD tie-break, anchors/pins excluded, < 7 days → `daysOfHistory` reported, empty history.
- Snapshot reader: picks the newest snapshot ≥ 15 min old; falls back; returns null when none.
- Variant gating helper: `effectiveTier(view, accountTier)`.

## QA checklist (kumami-qa must verify)
1. Plus sidebar shows "Flow Radar Plus" and "Watchlist Plus"; Pro → Tools shows Flow Radar Pro, Watchlist Pro, Spot Pulse Pro (in that order) above Security Scanner.
2. Flow Radar Plus (Plus **and** Pro account): only BTC/ETH/SOL/BNB/HYPE events, no LOW chip, no Flow Balance panel, no cross-signal outlines, "Delayed 15m" chip, title "Flow Radar Plus". The payload's newest event is ≥ 15 min older than the Pro payload's newest (or the honest "starting" state).
3. Flow Radar Pro (Pro account): title "Flow Radar Pro", LOW available, Flow Balance panel present, coins beyond the 5 appear (if any in the feed), no delay chip, newest event within ~2 min.
4. A Plus account opening `/world/pro?tab=flowradar` gets the Pro teaser, not Pro data (API with `view=pro` returns the Plus payload for a non-Pro account).
5. Watchlist Plus (both accounts): exactly 5 rows (the anchors), no add box, no "Your Watchlist" or "Also Worth Watching", title "Watchlist Plus".
6. Watchlist Pro: anchors + add/remove a coin (add DOGE, then remove it; cap counter updates) + "Also Worth Watching" with 5 or fewer rows, none of which are anchors or pinned coins. Shows "building history (n/7 days)" while history is short.
7. Spot Pulse Pro: title "Spot Pulse Pro", up to 10 tiles (anchors first), no "delayed" text, market verdict uses the 10-tile rules (unit-checked), alert cards present, 4H/24H/7D switch works.
8. Spot Pulse tile on On-Chain and Console: no "15-min delayed" text; "Unlock Spot Pulse Pro" link present and leads to the Pro tab.
9. Console Flow Radar preview (Plus) shows delayed events, not an empty panel (unless the snapshot store is still warming up).
10. Regression: smoke suite, Calendar suite and sidebar suite pass. No console errors; screenshots reviewed at desktop and mobile.

## Risks / open questions
- Snapshot and history writes add Firestore writes (~1/min for snapshots and ~6/hour for history). Fine for dev and modest for prod. Old snapshots are deleted.
- 7-day history fills only on days the feed is requested. Real "consistency" needs a week of normal traffic.
- Extra coins may lack CVD data on some days; those tiles show "No data".

## Out of scope
Liquidation-direction and smart-money severity fixes (gap report items), Flow Radar Pro's significance engine, Watchlist Pro's saved lists, wallet rows and ◆ tags. Separate tasks.
