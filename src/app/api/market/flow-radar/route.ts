/**
 * GET /api/market/flow-radar
 *
 * Returns filtered FlowEvent[]. Free-tier users only see events that are at
 * least FREE_TIER_DELAY_MINUTES old (default 30 min). Pro users see all events.
 *
 * Metadata included in the response:
 *   delayed: true  — indicates the free-tier delay was applied
 *   delayMinutes   — the configured delay window (only present when delayed)
 *
 * Cache: 60s (short TTL — flow events are the most time-sensitive data),
 * tier-independent key (ungated; gating applied server-side after retrieval).
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCachedFresh } from '@/lib/market/cache';
import { applyDelay } from '@/lib/market/gating';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DELAY_MINUTES = Number(process.env.FREE_TIER_DELAY_MINUTES ?? 30);
const delayMinutes = Number.isFinite(DELAY_MINUTES) && DELAY_MINUTES > 0 ? DELAY_MINUTES : 30;

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { tier } = auth;

  // Cache the full (pro) event list; apply delay post-retrieval
  const allEvents = await getCachedFresh('market:v2:flow-radar', 60, () => getProvider().flowRadar('pro'));

  const events = applyDelay(allEvents, tier);
  const delayed = tier === 'free';

  return NextResponse.json({
    events,
    delayed,
    ...(delayed ? { delayMinutes } : {}),
  });
}
