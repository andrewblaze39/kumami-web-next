/**
 * GET /api/market/flow-radar
 *
 * Returns the FlowRadarPayload for Flow Radar Plus (/world/flow-radar) and
 * Flow Radar Pro (/world/pro?tab=flowradar). The page sends ?view=plus|pro.
 * Events, buckets, verdict band and cross-signal rules are shared — Rachelle
 * v1.15 Plus §3 / Pro §18:
 *   Plus (?view=plus, every account) — 5 core assets, HIGH + MED, the 4 event
 *     types (Exchange Flow = Dry Powder, market-wide so it shows for every
 *     asset), served from the feed SNAPSHOT taken 15 min ago (flowSnapshots.ts).
 *   Pro (?view=pro AND a Pro account) — real-time, every coin, LOW too, plus
 *     Netflow Flip; coins under $1M 24h spot volume are hidden (flowLiquidity.ts).
 *   Both get the cross-signal outlines (flowCrossSignal.ts).
 *
 * Still not built: Large Limit Order (blocked on the current data plan) and the
 * significance engine (needs the background collector).
 *
 * Cache: the shared event buffer is 60s (market:v3:flow-radar — v3 since the
 * v1.15 directions); filtering happens per request after retrieval.
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCachedFresh } from '@/lib/market/cache';
import { effectiveTier, getDelayMinutes, parseView } from '@/lib/market/gating';
import { readDelayedFlow, saveFlowSnapshot } from '@/lib/market/flowSnapshots';
import { recordFlowDay } from '@/lib/market/flowHistory';
import { computeFlowVerdict } from '@/lib/market/rules/flowVerdict';
import { computeFlowCrossSignal, type FlowCrossSignalContext } from '@/lib/market/rules/flowCrossSignal';
import { computeWhaleEventCounts } from '@/lib/market/rules/watchlistSectionC';
import { filterIlliquid, spotVolumeMap } from '@/lib/market/rules/flowLiquidity';
import { netflowList } from '@/lib/market/live/cg-endpoints';
import type { FlowEvent, FlowRadarPayload } from '@/lib/market/contracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cross-signal enrichment (Kumami Pro §1.8) is a nice-to-have on top of the
// core event feed, not core functionality — it must never be allowed to hold
// up the response. Each source gets its own short timeout; a slow/unhealthy
// upstream degrades that one signal to "unavailable" rather than stalling
// the whole page (this matters most exactly when CoinGlass is degraded,
// which is also when several endpoints can each eat a 10s connect-timeout +
// 1 retry — without a bound here those can stack into 30-40s responses).
const CROSS_SIGNAL_TIMEOUT_MS = 4_000;
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

const PLUS_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];
// Rachelle v1.15 Plus §3: the 4 Plus events (Exchange Flow = Dry Powder);
// Pro also keeps Netflow Flip.
const PLUS_EVENT_TYPES: FlowEvent['type'][] = ['whale_transfer', 'exchange_flow', 'liq_spike', 'smart_money'];
const PRO_EVENT_TYPES: FlowEvent['type'][] = [...PLUS_EVENT_TYPES, 'netflow_flip'];

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const tier = effectiveTier(parseView(request.url), auth.tier);

  // Cache the full (wide) event list; roster/severity/type filtering post-retrieval.
  const allEvents = await getCachedFresh('market:v3:flow-radar', 60, () => getProvider().flowRadar('pro'));
  // Side effects for the Plus delay + 7-day consistency history (throttled, never throw).
  void saveFlowSnapshot(allEvents);
  void recordFlowDay(allEvents);

  const isPro = tier === 'pro';
  const delayed = !isPro;
  const delayMinutes = getDelayMinutes();
  // Plus: the snapshot from ≥15 min ago. null = no snapshot old enough yet (cold start).
  const delayedFeed = delayed ? await readDelayedFlow(delayMinutes) : null;
  const base = isPro ? allEvents : (delayedFeed?.events ?? []);

  let events: FlowEvent[] = base.filter((e) => (isPro ? PRO_EVENT_TYPES : PLUS_EVENT_TYPES).includes(e.type));

  if (!isPro) {
    // Market-wide Dry Powder shows under every asset filter (v1.15 Plus §3).
    events = events.filter((e) => (e.marketWide || PLUS_ASSETS.includes(e.asset)) && (e.severity === 'HIGH' || e.severity === 'MED'));
  } else {
    // Illiquid filter (v1.15 Pro §18): hide coins under $1M 24h spot volume.
    const spotRows = await withTimeout(netflowList('spot'), CROSS_SIGNAL_TIMEOUT_MS).catch(() => null);
    events = filterIlliquid(events, spotRows ? spotVolumeMap(spotRows) : null);
  }

  // Cross-signal outlines (v1.15 Plus §3 — Plus and Pro, same rules). Each source is
  // best-effort (timeout + catch) so one slow read can't drop the others or the feed.
  const [spotPulse, console_, fearGreed] = await Promise.all([
    withTimeout(getCachedFresh('market:v2:spotpulse:free:4H', 60, () => getProvider().spotPulse('free', '4H')), CROSS_SIGNAL_TIMEOUT_MS).catch(() => null),
    withTimeout(getCachedFresh('market:v2:console', 300, () => getProvider().console()), CROSS_SIGNAL_TIMEOUT_MS).catch(() => null),
    withTimeout(getCachedFresh('market:v2:fear-greed', 300, () => getProvider().fearGreed()), CROSS_SIGNAL_TIMEOUT_MS).catch(() => null),
  ]);
  const now = Date.now();
  const ctx: FlowCrossSignalContext = {
    spotPulseVerdictByAsset: spotPulse ? Object.fromEntries(spotPulse.tiles.map((t) => [t.asset, t.verdict])) : undefined,
    consoleRegimeByAsset: console_ ? Object.fromEntries(console_.regimeChips.map((c) => [c.asset, c.regime])) : undefined,
    // The Watchlist's Whale Accumulation / Distribution source: whale events in the last 24h.
    whaleCounts24hByAsset: computeWhaleEventCounts(base.filter((e) => now - Date.parse(e.ts) <= 24 * 3_600_000)),
    fearGreedLabel: fearGreed?.composite.label,
  };
  events = events.map((e) => {
    const crossSignal = computeFlowCrossSignal(e, ctx);
    return crossSignal ? { ...e, crossSignal } : e;
  });

  // Server verdict = the 4H band (the page recomputes it for the selected window).
  const last4h = events.filter((e) => now - Date.parse(e.ts) <= 4 * 3_600_000);
  const { verdict, sentence, statLine } = computeFlowVerdict(last4h, '4H');
  const totalUsd = events.reduce((sum, e) => sum + e.amountUsd, 0);
  const assets = isPro ? Array.from(new Set(events.filter((e) => !e.marketWide).map((e) => e.asset))).sort() : PLUS_ASSETS;

  const payload: FlowRadarPayload = {
    events,
    verdict,
    sentence,
    statLine,
    footer: { eventCount: events.length, totalUsd, assets },
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    ...payload,
    delayed,
    ...(delayed ? { delayMinutes, delayedAsOf: delayedFeed ? new Date(delayedFeed.asOf).toISOString() : null } : {}),
  });
}
