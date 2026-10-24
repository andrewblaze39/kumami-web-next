# Plan — v1.18 live data reliability

**Status:** active, local-only, reversible
**Source:** Andrew’s 2026-10-25 Rachelle-feedback handoff; Rachelle Product Spec v1.17 link. The linked Google Doc is not yet readable from this machine’s authenticated Google session, so no claim of full document extraction is made.
**Branch:** `kumami-dev/v118-live-data-reliability-20261025`

## Facts established from the current source

- A protected collector already exists at `POST /api/v1/cron/collect`. It reads CoinGlass-derived Flow Radar events, writes `flow_events`, `flow_hourly`, `flow_daily`, and `flow_meta/collector`.
- It is not proven continuously scheduled. The present page-triggered fallback means history may only build while users load Console/Flow Radar.
- CoinGlass has a per-instance rolling budget of 70 calls/minute. This is not a cross-instance quota guarantee.
- Firestore `market_cache` provides TTL storage and same-process request de-duplication. It is not a substitute for an always-on collector.
- Binance browser WebSocket pricing already exists, but is currently per-hook, has no freshness timestamp/connection state, and is used only on Pro surfaces.
- The suggested smart-money threshold is already implemented for SOL/BNB/HYPE: MED at $2M. Whale-transfer MED cannot go below $10M with the current API. The materially new threshold request is liquidation MED at $10M/hour for SOL/BNB/HYPE.

## v1.18 approach

### Phase 0 — requirement traceability and baseline
- Record source intake and every v1.18 deliverable in FounderOS Roadmap.
- Preserve source provenance: **directly confirmed source**, **Andrew-supplied feedback**, or **deduction**.
- Read-only health baseline on kumami-dev: collector metadata, gap coverage, response freshness, configured scheduler/secret state, CoinGlass errors, and 7-day event-volume distribution.
- Do not activate any scheduler, add secrets, or change production configuration in this phase.

### Phase 1 — collector correctness and observability
- Add a cross-instance Firestore lease so cron, retry, and page fallback cannot overlap and double-count hourly totals.
- Record `lastSuccessAt`, failed-run status/error category, run duration, source data timestamp, and coverage status separately from attempt time.
- Make Plus delayed-feed freshness derive from the last successful collection, not from `now - delay`.
- Treat missing hourly blocks as incomplete history rather than zero flow.
- Verify with unit tests plus a bounded dev soak before any production activation.

### Phase 2 — shared browser live-price feed
- Replace per-component sockets with one shared per-tab Binance WebSocket manager.
- Deduplicate symbols, reconnect safely, batch React updates (maximum once per second), record per-symbol `updatedAt`, and expose connection state.
- Use Binance for only the live spot price and its matching 24h move. Keep CoinGlass for market rules, CVD, flows, and verdicts.
- On disconnect/block, retain the last verified server payload and show its actual age instead of pretending it is live.

### Phase 3 — approved price placements
1. Console regime-chip prices.
2. Watchlist Plus prices.
3. Spot Pulse: a distinct live spot-price line; its 4H/24H/7D rule-derived percentage and verdict remain server data.
4. On-Chain selected-asset header — a new UI element, requiring a focused design check before it ships.

### Phase 4 — freshness/cadence contract
- Standardize visible update labels using true payload/source timestamps:
  - daily: ETF flows;
  - eight-hour: funding where applicable;
  - live: Binance price stream while connected;
  - `Updated n min ago`: server-derived payloads such as Spot Pulse.
- Correct the Watchlist Plus “updated every minute” copy and Spot Pulse’s stale threshold behavior.

### Phase 5 — threshold calibration
- First collect 7 days of observed SOL/BNB/HYPE liquidation and smart-money distributions.
- Keep raw low-severity events available for analysis.
- Choose one explicit policy before changing UI behavior:
  1. a Plus-only inclusion rule for selected assets, leaving Pro classification/history stable; or
  2. a shared per-asset severity table, accepting that Pro labels/history and downstream Section C may change.
- The current code already supports the proposed smart-money $2M MED value for non-majors. Do not duplicate or re-implement it.

## Test plan

- Unit: collector lease and retry behavior; last-success/failure freshness; coverage-gap state; threshold policy; Binance miniTicker parsing, timestamping, deduplication, reconnect state, and batched notifications.
- Route: cron authentication/configuration behavior and truthful freshness fields.
- Browser QA: connected, reconnecting, and blocked Binance scenarios; Plus/Pro access boundaries; mobile/desktop review; no `$0`, NaN, or false-live labels.
- Dev soak: 72 hours after approved dev scheduler activation; review rate-limit, error, cache, and Firestore operation evidence.

## Decisions reserved for Andrew

1. Approve a dev-only Scheduler + secret rollout after Phase 1 code and operational checklist are reviewed.
2. Approve a production scheduler rollout only after dev soak evidence; this changes background traffic, Firestore operations, and CoinGlass usage.
3. Confirm that Watchlist Plus should receive live Binance spot prices, and that Binance spot price/24h change may replace the present CoinGlass futures pair figures.
4. Pick threshold policy after observed data: Plus-only visibility versus shared cross-tier severity semantics.
5. Authorize access to the v1.17 Google Doc from the signed-in local Google session so the full request document can be imported line-by-line.

## Rollback

Everything in this plan is isolated in the named branch/worktree. Until merged, discard with:

```bash
git -C C:/Users/Andrew/CascadeProjects/kumami-web-next worktree remove C:/Users/Andrew/CascadeProjects/kumami-worktrees/v118-live-data-reliability
git -C C:/Users/Andrew/CascadeProjects/kumami-web-next branch -D kumami-dev/v118-live-data-reliability-20261025
```

No `dev`, `main`, production configuration, or scheduled collector is modified by this plan.