/**
 * GET /api/market/fear-greed
 *
 * Returns the FearGreedPayload for the standalone /world/fear-greed tab
 * (Plus tier): the 5-metric composite score + sub-metric tiles + raw index
 * history for the chart. Same payload for every tier — this tab has no
 * tiered restriction in the current spec.
 *
 * Cache: 300s (sub-metrics are slow-moving; matches the doc's refresh cadence
 * for price momentum / volatility / market composition).
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getFearGreedIndex } from '@/lib/market/fearGreedIndex';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const payload = await getFearGreedIndex();
  return NextResponse.json(payload);
}
