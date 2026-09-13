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
 *     raised per-type caps), all 3 severities including LOW, no delay, and a
 *     Pro-only cross-signal tag (whale outflow + Fear&Greed reading Fear).
 *
 * Event 5 (Degen Smart Money, Kumami Pro §4.3a) is NOT implemented — it needs
 * a Solana wallet-tagging source (Birdeye/Helius/Moralis), no key configured.
 * The Liquidation-Heatmap-cluster cross-signal (§4.7a) is also not
 * implemented — that endpoint is tier-locked on the current CoinGlass key.
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
import { computeFlowCrossSignal } from '@/lib/market/rules/flowCrossSignal';
import type { FlowEvent, FlowRadarPayload } from '@/lib/market/contracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    // Pro-only: tag whale outflows against current Fear & Greed sentiment.
    const fearGreed = await getCachedFresh('market:v2:fear-greed', 300, () => getProvider().fearGreed()).catch(() => null);
    if (fearGreed) {
      events = events.map((e) => {
        const crossSignal = computeFlowCrossSignal(e, fearGreed.composite.label);
        return crossSignal ? { ...e, crossSignal } : e;
      });
    }
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
