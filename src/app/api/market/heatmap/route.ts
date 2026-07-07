/**
 * GET /api/market/heatmap
 *
 * Returns a HeatmapPayload. Free-tier users see at most FREE_HEATMAP_ASSET_CAP
 * assets (default 5); pro users see all 10. The capped flag is included in the
 * response so the UI can show an upgrade prompt.
 *
 * Cache: 300s, tier-independent key (ungated payload cached; gating applied
 * server-side after retrieval so free and pro share the same cached value).
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCached } from '@/lib/market/cache';
import { capAssets } from '@/lib/market/gating';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { tier } = auth;

  // Always fetch the pro (full) payload so the cache key is tier-independent
  const fullPayload = await getCached('market:heatmap', 300, () => getProvider().heatmap('pro'));

  const originalLength = fullPayload.assets.length;
  const cappedAssets = capAssets(fullPayload.assets, tier);
  const wasCapped = tier === 'free' && originalLength > cappedAssets.length;

  return NextResponse.json({
    ...fullPayload,
    assets: cappedAssets,
    capped: wasCapped,
  });
}
