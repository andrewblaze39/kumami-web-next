/**
 * GET /api/market/console
 *
 * Returns the full ConsolePayload. The flowRadar sub-array embedded in the
 * payload has applyDelay applied for free-tier users so real-time flow events
 * are withheld. All other fields pass through regardless of tier.
 *
 * Cache: 300s, tier-independent key (gating applied after retrieval).
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCached } from '@/lib/market/cache';
import { applyDelay } from '@/lib/market/gating';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { tier } = auth;

  const payload = await getCached('market:console', 300, () => getProvider().console());

  // Apply delay to the embedded flowRadar events for free-tier users
  const gatedPayload = {
    ...payload,
    flowRadar: applyDelay(payload.flowRadar, tier),
  };

  return NextResponse.json(gatedPayload);
}
