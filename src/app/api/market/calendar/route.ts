/**
 * GET /api/market/calendar
 *
 * Returns the CalendarPayload (macro events + token unlocks + admin-authored
 * team events) for the shared /world/calendar page, the Console Calendar
 * preview and the "Needs your attention" popup, filtered per tier:
 *   - admin events carry optional audience flags (Plus / Pro, set independently);
 *     legacy events without them are shown to both.
 *
 * Airdrop TGE / claim entries come from the Pro-only Airdrops & Whitelist tool, so
 * they're stripped for non-Pro accounts (Andrew, 21 Oct 2026: Pro-only until
 * Rachelle confirms whether Plus should see them).
 *
 * Cache: none at the route level on purpose — the CoinGlass feeds are already
 * cached per endpoint (30 min) inside the builder, and the admin events must
 * reflect a publish/edit/delete straight away.
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { calendarEventsForTier } from '@/lib/market/rules/calendarEvents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const payload = await getProvider().calendar();
  return NextResponse.json({ ...payload, events: calendarEventsForTier(payload.events, auth.tier) });
}
