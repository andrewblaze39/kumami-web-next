/**
 * GET /api/market/flow-radar
 *
 * Returns the full FlowRadarPayload for the standalone /world/flow-radar tab
 * (Plus tier): events filtered server-side to the fixed 5-asset roster
 * (BTC/ETH/SOL/BNB/HYPE) and HIGH+MED severity only, plus the market-wide
 * verdict band and footer stats — all computed server-side per the "no
 * threshold logic in frontend" rule.
 *
 * Free-tier users additionally get the existing time delay (events younger
 * than FREE_TIER_DELAY_MINUTES are withheld); Pro users see everything with
 * no delay (breadth beyond the 5-asset roster is a separate, not-yet-built
 * Pro expansion — see the Kumami Pro spec).
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
import type { FlowRadarPayload } from '@/lib/market/contracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DELAY_MINUTES = Number(process.env.FREE_TIER_DELAY_MINUTES ?? 30);
const delayMinutes = Number.isFinite(DELAY_MINUTES) && DELAY_MINUTES > 0 ? DELAY_MINUTES : 30;

const PLUS_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];
// Plus tier ships exactly 4 event types (Kumami Plus §4.1); netflow_flip and
// whale_wall aren't part of the Plus scope.
const PLUS_EVENT_TYPES = ['whale_transfer', 'exchange_flow', 'liq_spike', 'smart_money'];

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { tier } = auth;

  // Cache the full (pro) event list; apply delay + roster/severity/type filtering post-retrieval
  const allEvents = await getCachedFresh('market:v2:flow-radar', 60, () => getProvider().flowRadar('pro'));

  const delayed = tier === 'free';
  const events = applyDelay(allEvents, tier)
    .filter((e) =>
      PLUS_ASSETS.includes(e.asset) &&
      PLUS_EVENT_TYPES.includes(e.type) &&
      (e.severity === 'HIGH' || e.severity === 'MED'));

  const { verdict, sentence, statLine } = computeFlowVerdict(events);
  const totalUsd = events.reduce((sum, e) => sum + e.amountUsd, 0);

  const payload: FlowRadarPayload = {
    events,
    verdict,
    sentence,
    statLine,
    footer: { eventCount: events.length, totalUsd, assets: PLUS_ASSETS },
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    ...payload,
    delayed,
    ...(delayed ? { delayMinutes } : {}),
  });
}
