/**
 * GET /api/market/watchlist
 *
 * Returns a WatchlistPayload for the authenticated user. The assets array is
 * sliced to watchlistSlots(tier): 5 for free, Infinity (no slice) for pro.
 * The slots field in the response reflects the user's tier limit.
 *
 * Cache: 300s, keyed per uid so each user's watchlist is cached independently.
 * Tier-independent cache per uid (gating applied after retrieval).
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCached } from '@/lib/market/cache';
import { watchlistSlots } from '@/lib/market/gating';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { uid, tier } = auth;

  // Cache the pro watchlist (full) per uid; apply slot cap after retrieval
  const fullPayload = await getCached(
    `market:watchlist:${uid}`,
    300,
    () => getProvider().watchlist(uid, 'pro'),
  );

  const slots = watchlistSlots(tier);
  // Infinity means no cap for pro users
  const cappedAssets = Number.isFinite(slots)
    ? fullPayload.assets.slice(0, slots)
    : fullPayload.assets;

  return NextResponse.json({
    ...fullPayload,
    slots,
    assets: cappedAssets,
  });
}
