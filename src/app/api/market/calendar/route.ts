/**
 * GET /api/market/calendar
 *
 * Returns the CalendarPayload (macro events + token unlocks) for the
 * standalone /world/calendar tab. Same payload for every tier.
 *
 * Cache: 1800s (30 min) — matches the doc's daily-ish refresh cadence for
 * calendar/unlock data.
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

  const payload = await getCachedFresh('market:v2:calendar', 1800, () => getProvider().calendar());
  return NextResponse.json(payload);
}
