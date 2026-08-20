/**
 * GET /api/market/onchain?asset=BTC&range=24h
 *
 * Returns an OnChainPayload for the given asset + range.
 * Supported assets: BTC, ETH, SOL, BNB, AVAX, ARB, DOGE, LINK, APT, SUI
 * Supported ranges: 24h, 7d, 30d
 *
 * Cache: 300s, key per asset+range (tier-independent — no tier-sensitive
 * fields are present in OnChainPayload; panels contain only PanelVerdict +
 * series data which is the same for all tiers).
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCachedFresh } from '@/lib/market/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ASSETS = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'DOGE', 'LINK', 'APT', 'SUI',
]);
const ALLOWED_RANGES = new Set(['24h', '7d', '30d']);

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const asset = (url.searchParams.get('asset') ?? '').toUpperCase();
  const range = url.searchParams.get('range') ?? '';

  if (!ALLOWED_ASSETS.has(asset) || !ALLOWED_RANGES.has(range)) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const payload = await getCachedFresh(
    `market:v2:onchain:${asset}:${range}`,
    300,
    () => getProvider().onchain(asset, range as '24h' | '7d' | '30d'),
  );

  return NextResponse.json(payload);
}
