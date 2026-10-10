/**
 * GET /api/market/console
 *
 * Returns the ConsolePayload. The Console is a Plus page, so its Flow Radar
 * preview always shows the Flow Radar PLUS feed (Andrew's spec v1.6): the
 * snapshot taken 15 minutes ago (lib/market/flowSnapshots.ts), limited to
 * BTC/ETH/SOL/BNB/HYPE and HIGH/MED events — for every account. This route
 * also refreshes the shared Flow Radar buffer and saves snapshots/history, so
 * the delayed feed keeps filling even when nobody opens Flow Radar itself.
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCachedFresh } from '@/lib/market/cache';
import { getDelayMinutes } from '@/lib/market/gating';
import { readDelayedFlow, saveFlowSnapshot } from '@/lib/market/flowSnapshots';
import { recordFlowDay } from '@/lib/market/flowHistory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PLUS_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const [payload, buffer] = await Promise.all([
    getCachedFresh('market:v2:console', 300, () => getProvider().console()),
    getCachedFresh('market:v2:flow-radar', 60, () => getProvider().flowRadar('pro')).catch(() => null),
  ]);
  if (buffer) {
    void saveFlowSnapshot(buffer);
    void recordFlowDay(buffer);
  }

  const delayed = await readDelayedFlow(getDelayMinutes());
  const flowRadar = (delayed?.events ?? []).filter(
    (e) => PLUS_ASSETS.includes(e.asset) && (e.severity === 'HIGH' || e.severity === 'MED'),
  );

  return NextResponse.json({ ...payload, flowRadar });
}
