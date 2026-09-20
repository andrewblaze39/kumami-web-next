/**
 * GET /api/market/flow-radar
 *
 * Returns the full FlowRadarPayload for the standalone /world/flow-radar tab.
 *
 * Tiering (Kumami Pro §4.1a "Pro Tier Setup — replaces Plus restrictions"):
 *   free/plus — fixed 5-asset roster (BTC/ETH/SOL/BNB/HYPE), the 4 real event
 *     types, HIGH+MED severity only, plus the existing time delay.
 *   pro       — no asset-roster restriction (full tracked universe already
 *     flowing through the same bulk CoinGlass endpoints — see flow.ts's
 *     raised per-type caps), all 3 severities including LOW, no delay, and
 *     Pro-only cross-signal tags (Kumami Pro §1.8 — see flowCrossSignal.ts).
 *
 * Event 5/6 (Netflow Flip already ships as its own type; Large Limit Order,
 * Kumami Pro §1.2 Event 6) is NOT implemented — /api/futures/orderbook/
 * large-limit-order is tier-locked on the current CoinGlass key. The
 * significance/baseline detection engine (§1.7) is also NOT implemented —
 * it needs a new daily scheduled-job mechanism this repo doesn't have yet.
 *
 * The market-verdict thresholds ($500M/count/$300M) are unchanged from Plus —
 * per the spec's own "Open items", they need re-validation against real
 * Pro-scale (100+ asset) event volume before being tuned further.
 *
 * Cache: 60s (short TTL — flow events are the most time-sensitive data),
 * tier-independent key (ungated; gating applied server-side after retrieval).
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCachedFresh } from '@/lib/market/cache';
import { applyDelay } from '@/lib/market/gating';
import { computeFlowVerdict } from '@/lib/market/rules/flowVerdict';
import { computeFlowCrossSignal, type FlowCrossSignalContext } from '@/lib/market/rules/flowCrossSignal';
import { computeWhaleEventCounts } from '@/lib/market/rules/watchlistSectionC';
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

const DELAY_MINUTES = Number(process.env.FREE_TIER_DELAY_MINUTES ?? 30);
const delayMinutes = Number.isFinite(DELAY_MINUTES) && DELAY_MINUTES > 0 ? DELAY_MINUTES : 30;

const PLUS_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];
// The 4 event types the builder actually emits (Kumami Plus §4.1). Fixed a
// prior bug here: this list said 'exchange_flow', a type the builder never
// produces (it emits 'netflow_flip' for that concept) — every Exchange Flow
// event was being silently filtered out for every tier.
const REAL_EVENT_TYPES = ['whale_transfer', 'netflow_flip', 'liq_spike', 'smart_money'];

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { tier } = auth;

  // Cache the full (wide) event list; apply delay + roster/severity/type filtering post-retrieval
  const allEvents = await getCachedFresh('market:v2:flow-radar', 60, () => getProvider().flowRadar('pro'));

  const delayed = tier === 'free';
  const isPro = tier === 'pro';

  let events: FlowEvent[] = applyDelay(allEvents, tier)
    .filter((e) => REAL_EVENT_TYPES.includes(e.type));

  if (!isPro) {
    events = events.filter((e) => PLUS_ASSETS.includes(e.asset) && (e.severity === 'HIGH' || e.severity === 'MED'));
  } else {
    // Pro-only cross-signal amplification (Kumami Pro §1.8) — pulls already
    // -cached reads from Spot Pulse and Console, each independently
    // best-effort (timeout + catch) so one slow or failing source can't drop
    // the others or delay the response. The "Watchlist shows Whale
    // Accumulation" rule is computed directly from this same event buffer
    // (computeWhaleEventCounts — identical logic to what Watchlist Pro uses
    // to derive that tag) rather than by calling the Watchlist API: that API
    // only ever returns Section A's 5 fixed anchors, so a real fetch there
    // would silently never match non-anchor assets, and would re-fetch data
    // this route already has in hand.
    const [spotPulse, console_, fearGreed] = await Promise.all([
      withTimeout(getCachedFresh('market:v2:spot-pulse:pro:4H', 60, () => getProvider().spotPulse('pro', '4H')), CROSS_SIGNAL_TIMEOUT_MS).catch(() => null),
      withTimeout(getCachedFresh('market:v2:console', 60, () => getProvider().console()), CROSS_SIGNAL_TIMEOUT_MS).catch(() => null),
      withTimeout(getCachedFresh('market:v2:fear-greed', 300, () => getProvider().fearGreed()), CROSS_SIGNAL_TIMEOUT_MS).catch(() => null),
    ]);

    const now = Date.now();
    const events24h = allEvents.filter((e) => now - Date.parse(e.ts) <= 24 * 3_600_000);
    const whaleCounts = computeWhaleEventCounts(events24h);
    const watchlistTagsByAsset = Object.fromEntries(
      Object.entries(whaleCounts).map(([asset, c]) => [
        asset,
        c.bearish >= 2 ? ['Whale Distribution'] : c.bullish >= 2 ? ['Whale Accumulation'] : [],
      ]),
    );

    const ctx: FlowCrossSignalContext = {
      spotPulseVerdictByAsset: spotPulse
        ? Object.fromEntries(spotPulse.tiles.map((t) => [t.asset, t.verdict]))
        : undefined,
      consoleRegimeByAsset: console_
        ? Object.fromEntries(console_.regimeChips.map((c) => [c.asset, c.regime]))
        : undefined,
      watchlistTagsByAsset,
      fearGreedLabel: fearGreed?.composite.label,
    };

    events = events.map((e) => {
      const crossSignal = computeFlowCrossSignal(e, ctx);
      return crossSignal ? { ...e, crossSignal } : e;
    });
  }

  const { verdict, sentence, statLine } = computeFlowVerdict(events);
  const totalUsd = events.reduce((sum, e) => sum + e.amountUsd, 0);
  const assets = isPro ? Array.from(new Set(events.map((e) => e.asset))).sort() : PLUS_ASSETS;

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
    ...(delayed ? { delayMinutes } : {}),
  });
}
