/**
 * GET /api/market/spot-pulse
 *
 * Returns the SpotPulsePayload for the caller's tier. Plus is polled/cached at
 * 60s; Pro at 15s (§12 Free vs Pro Refresh Cadence). Cache key is per-tier so
 * the two cadences don't clobber each other.
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCachedFresh } from '@/lib/market/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { tier } = auth;

  const ttl = tier === 'pro' ? 15 : 60;
  const payload = await getCachedFresh(
    `market:v2:spotpulse:${tier}`,
    ttl,
    () => getProvider().spotPulse(tier),
  );

  return NextResponse.json(payload);
}
