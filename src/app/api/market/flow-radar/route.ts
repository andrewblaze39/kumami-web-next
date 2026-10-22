/**
 * GET /api/market/flow-radar
 *
 * Returns the FlowRadarPayload for Flow Radar Plus (/world/flow-radar) and
 * Flow Radar Pro (/world/pro?tab=flowradar). The page sends ?view=plus|pro.
 * Events, buckets, verdict band and cross-signal rules are shared — Rachelle
 * v1.15 Plus §3 / Pro §18:
 *   Plus (?view=plus, every account) — 5 core assets, HIGH + MED, the 4 event
 *     types (Exchange Flow = Dry Powder, market-wide so it shows for every
 *     asset), served from the stored event history: events visible for 15+ min, last
 *     24h (flowDelayed.ts).
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
import { readDelayedFlow, recordFlowEvents } from '@/lib/market/flowDelayed';
import { PLUS_ASSETS, PLUS_EVENT_TYPES } from '@/lib/market/rules/flowDelayed';
import { recordFlowDay } from '@/lib/market/flowHistory';
import { computeFlowVerdict, type FlowWindow } from '@/lib/market/rules/flowVerdict';
import { computeFlowCrossSignal, type FlowCrossSignalContext } from '@/lib/market/rules/flowCrossSignal';
import { computeWhaleEventCounts } from '@/lib/market/rules/watchlistSectionC';
import { filterIlliquid, spotVolumeMap } from '@/lib/market/rules/flowLiquidity';
import { netflowList } from '@/lib/market/live/cg-endpoints';
import { binanceSpotVolumes } from '@/lib/market/live/binance';
import { aiSentence } from '@/lib/market/llm/gemini';
import { flowVerdictPrompt } from '@/lib/market/llm/aiText';
const WINDOW_MS: Record<FlowWindow, number> = { '1H': 3_600_000, '4H': 4 * 3_600_000, '24H': 24 * 3_600_000, '7D': 7 * 24 * 3_600_000 };
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
const AI_TIMEOUT_MS = 3_000;
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// Pro also keeps Netflow Flip.
const PRO_EVENT_TYPES: FlowEvent['type'][] = [...PLUS_EVENT_TYPES, 'netflow_flip'];

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const tier = effectiveTier(parseView(request.url), auth.tier);

  // Cache the full (wide) event list; roster/severity/type filtering post-retrieval.
  const allEvents = await getCachedFresh('market:v3:flow-radar', 60, () => getProvider().flowRadar('pro'));
  // Side effects: store events for the Plus delay + 7-day consistency history (throttled, never throw).
  recordFlowEvents();
  void recordFlowDay(allEvents);

  const isPro = tier === 'pro';
  const delayed = !isPro;
  const delayMinutes = getDelayMinutes();
  // Plus: stored events visible for ≥15 min. null = history younger than 15 min (first run).
  const delayedFeed = delayed ? await readDelayedFlow(delayMinutes) : null;
  const base = isPro ? allEvents : (delayedFeed?.events ?? []);

  let events: FlowEvent[] = base.filter((e) => (isPro ? PRO_EVENT_TYPES : PLUS_EVENT_TYPES).includes(e.type));

  if (!isPro) {
    // Market-wide Dry Powder shows under every asset filter (v1.15 Plus §3).
    events = events.filter((e) => (e.marketWide || PLUS_ASSETS.includes(e.asset)) && (e.severity === 'HIGH' || e.severity === 'MED'));
  } else {
    // Illiquid filter (v1.15 Pro §18): hide coins under $1M 24h spot volume.
    // Coins outside the list's top ~100 fall back to their Binance volume (Andrew, 21 Oct 2026).
    const [spotRows, binanceVol] = await Promise.all([
      withTimeout(netflowList('spot'), CROSS_SIGNAL_TIMEOUT_MS).catch(() => null),
      withTimeout(binanceSpotVolumes(), CROSS_SIGNAL_TIMEOUT_MS).catch(() => null),
    ]);
    events = filterIlliquid(events, spotRows ? spotVolumeMap(spotRows) : null, binanceVol);
  }

  // Cross-signal outlines (v1.15 Plus §3 — Plus and Pro, same rules). Each source is
  // best-effort (timeout + catch) so one slow read can't drop the others or the feed.
  const [spotPulse, console_, fearGreed] = await Promise.all([
    withTimeout(getCachedFresh('market:v3:spotpulse:free:4H', 60, () => getProvider().spotPulse('free', '4H')), CROSS_SIGNAL_TIMEOUT_MS).catch(() => null),
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
  const inWindow = (w: FlowWindow) => events.filter((e) => now - Date.parse(e.ts) <= WINDOW_MS[w]);
  const { verdict, sentence, statLine } = computeFlowVerdict(inWindow('4H'), '4H');

  // AI sentence under the band, per window (v1.15 Plus §3). The page uses it only while
  // its own band (same window, no asset/type/severity filter) has the same verdict.
  const windows: FlowWindow[] = isPro ? ['1H', '4H', '24H', '7D'] : ['1H', '4H', '24H'];
  const aiSentences: Partial<Record<FlowWindow, { verdict: string; text: string }>> = {};
  await Promise.all(windows.map(async (w) => {
    const evs = inWindow(w);
    if (evs.length === 0) return; // nothing to say beyond the template ("flow is calm")
    const band = computeFlowVerdict(evs, w);
    const top = [...evs].sort((a, b) => b.amountUsd - a.amountUsd).slice(0, 3);
    const facts = { window: w, verdict: band.verdict.label, statLine: band.statLine, top: top.map((e) => `${e.asset} ${e.direction} $${Math.round(e.amountUsd / 1e6)}M`) };
    // One sentence per tier + window + verdict + biggest event per 30 min keeps AI calls to a few hundred a day.
    const key = `flow3:${isPro ? 'pro' : 'plus'}:${w}:${band.verdict.label}:${top[0] ? `${top[0].asset}-${top[0].direction}` : ''}`;
    // A cold AI call never holds the feed up for long; the fetch keeps running and fills the cache.
    const r = await withTimeout(aiSentence(key, flowVerdictPrompt(facts), band.sentence, 1800), AI_TIMEOUT_MS).catch(() => null);
    if (r?.ai) aiSentences[w] = { verdict: band.verdict.label, text: r.text };
  }));
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
    aiSentences,
    delayed,
    ...(delayed ? { delayMinutes, delayedAsOf: delayedFeed ? new Date(delayedFeed.asOf).toISOString() : null } : {}),
  });
}
