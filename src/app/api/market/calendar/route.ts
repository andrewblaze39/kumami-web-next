/**
 * GET /api/market/calendar[?view=pro]
 *
 * Returns the CalendarPayload (admin-authored team events + published airdrop
 * TGE / claim days, plus the macro and token-unlock feeds when an admin has
 * switched them on) for the Calendar UIs.
 *
 * Two calendars (Andrew, 29 Oct 2026):
 *   - default = Calendar Plus, for every signed-in account (also Pro users on the
 *     Plus page, the Console mini calendar, the badge and the attention popup):
 *     no airdrops, no token unlocks, no events the admin marked "Pro only".
 *   - ?view=pro = Calendar Pro, Pro accounts only (403 pro_required otherwise):
 *     Calendar Plus plus those Pro-only events.
 *
 * Cache: none at the route level on purpose — the CoinGlass feeds are already
 * cached per endpoint (30 min) inside the builder, and the admin events must
 * reflect a publish/edit/delete straight away.
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { calendarEventsForView } from '@/lib/market/rules/calendarEvents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const view = new URL(request.url).searchParams.get('view') === 'pro' ? 'pro' : 'plus';
  if (view === 'pro' && auth.tier !== 'pro') return NextResponse.json({ error: 'pro_required' }, { status: 403 });

  const payload = await getProvider().calendar();
  return NextResponse.json({ ...payload, events: calendarEventsForView(payload.events, view) });
}
