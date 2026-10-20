/**
 * GET /api/market/spot-pulse?tf=4H|24H|7D&view=plus|pro
 *
 * One engine (Rachelle v1.15 Plus §2.9), two versions:
 *   Plus (?view=plus, every account) — the Spot Pulse tile on On-Chain
 *     Insights / Console: the 5 core assets, 60s cache.
 *   Spot Pulse Pro (?view=pro AND a Pro account) — 10 tiles, 15s cache:
 *     row 1 = the 5 core assets; row 2 = the Watchlist Pro "Also Worth Watching"
 *     coins, empty slots filled with the top 24h spot-volume coins ("Top volume").
 *   Same share-based market verdict for both.
 * The underlying 1H data refreshes every 2 minutes (cvdHourly / priceHourly).
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCachedFresh } from '@/lib/market/cache';
import { effectiveTier, parseView } from '@/lib/market/gating';
import { pickExtraCoins } from '@/lib/market/consistentCoins';
import { ANCHOR_ASSETS, STABLECOINS } from '@/lib/market/rules/consistentFlow';
import { netflowList } from '@/lib/market/live/cg-endpoints';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Top 24h spot-volume coins (taker buy + sell), excluding core assets, stablecoins and wrapped tokens. */
async function topVolumeCoins(exclude: Set<string>, take: number): Promise<string[]> {
  if (take <= 0) return [];
  const rows = await netflowList('spot').catch(() => []);
  return rows
    .map((r) => ({ s: String(r.symbol).toUpperCase(), v: (Number(r.taker_buy_volume_usd_24h) || 0) + (Number(r.taker_sell_volume_usd_24h) || 0) }))
    .filter((r) => !exclude.has(r.s) && !STABLECOINS.includes(r.s) && !ANCHOR_ASSETS.includes(r.s))
    .sort((a, b) => b.v - a.v)
    .slice(0, take)
    .map((r) => r.s);
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const tier = effectiveTier(parseView(request.url), auth.tier);

  // Timeframe toggle — 4H (default) / 24H / 7D. Validate to avoid cache poisoning.
  const tfRaw = new URL(request.url).searchParams.get('tf');
  const timeframe: '4H' | '24H' | '7D' = tfRaw === '24H' || tfRaw === '7D' ? tfRaw : '4H';

  if (tier !== 'pro') {
    const payload = await getCachedFresh(`market:v3:spotpulse:free:${timeframe}`, 60, () =>
      getProvider().spotPulse('free', timeframe),
    );
    return NextResponse.json(payload);
  }

  // Pro row 2: Also Worth Watching (shared, not per-user pins — one cached payload
  // serves every Pro user), then "Top volume" fillers for any empty slot.
  const buffer = await getCachedFresh('market:v3:flow-radar', 60, () => getProvider().flowRadar('pro')).catch(() => []);
  const extras = await pickExtraCoins(buffer, new Set(ANCHOR_ASSETS));
  const extraAssets = extras.coins.map((c) => c.asset).slice(0, 5);
  const fillers = await topVolumeCoins(new Set(extraAssets), 5 - extraAssets.length);
  const payload = await getCachedFresh(
    `market:v3:spotpulse:pro:${timeframe}:${extraAssets.join(',')}|${fillers.join(',')}`,
    15,
    () => getProvider().spotPulse('pro', timeframe, extraAssets, fillers),
  );
  return NextResponse.json({ ...payload, extraMode: extras.mode, historyDays: extras.historyDays });
}
