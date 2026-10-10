/**
 * GET /api/market/spot-pulse?tf=4H|24H|7D&view=plus|pro
 *
 * Two versions (Andrew's spec v1.6):
 *   Plus (?view=plus, every account) — the Spot Pulse tile on On-Chain
 *     Insights / Console: the 5 fixed anchors, 60s cache. Not delayed.
 *   Spot Pulse Pro (?view=pro AND a Pro account) — the full tool: the 5
 *     anchors + Watchlist Pro's 5 extra coins (most consistent in Flow Radar
 *     over 7 days; 24h scoring while history builds), 10-tile market-verdict
 *     thresholds, 15s cache (real-time).
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCachedFresh } from '@/lib/market/cache';
import { effectiveTier, parseView } from '@/lib/market/gating';
import { pickExtraCoins } from '@/lib/market/consistentCoins';
import { ANCHOR_ASSETS } from '@/lib/market/rules/consistentFlow';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const tier = effectiveTier(parseView(request.url), auth.tier);

  // §7 timeframe toggle — 4H (default) / 24H / 7D. Validate to avoid cache poisoning.
  const tfRaw = new URL(request.url).searchParams.get('tf');
  const timeframe: '4H' | '24H' | '7D' = tfRaw === '24H' || tfRaw === '7D' ? tfRaw : '4H';

  if (tier !== 'pro') {
    const payload = await getCachedFresh(`market:v2:spotpulse:free:${timeframe}`, 60, () =>
      getProvider().spotPulse('free', timeframe),
    );
    return NextResponse.json(payload);
  }

  // Pro: second row = the shared "5 extra coins" (anchors excluded; not per-user
  // pins, so one cached payload serves every Pro user).
  const buffer = await getCachedFresh('market:v2:flow-radar', 60, () => getProvider().flowRadar('pro')).catch(() => []);
  const extras = await pickExtraCoins(buffer, new Set(ANCHOR_ASSETS));
  const extraAssets = extras.coins.map((c) => c.asset);
  const payload = await getCachedFresh(
    `market:v2:spotpulse:pro:${timeframe}:${extraAssets.join(',')}`,
    15,
    () => getProvider().spotPulse('pro', timeframe, extraAssets),
  );
  return NextResponse.json({ ...payload, extraMode: extras.mode, historyDays: extras.historyDays });
}
