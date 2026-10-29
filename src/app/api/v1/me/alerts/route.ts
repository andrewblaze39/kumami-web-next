/**
 * /api/v1/me/alerts — the caller's price alerts (Following & Alerts, Pro; v1.18 point 5).
 *   GET → { alerts: AlertDef[], state: { [id]: AlertState }, skippedLegacy }
 *         (first call imports alerts saved before v1.18)
 *   PUT { alerts: AlertDef[], rearm?: number[] } → same shape. Replaces the list; invalid alerts
 *         are dropped (max 50). Unchanged alerts keep their state; edited, resumed or `rearm`
 *         ones start fresh.
 * Checked server-side every minute by the cron collector (lib/pro/alertRunner); a trigger is
 * written to `notifications` for the user. 401 signed out · 403 pro_required.
 */
import { fail, handler, ok, rateLimited, readJson, requireUser } from '@/lib/api/v1';
import { NextResponse } from 'next/server';
import { isProActive } from '@/lib/pro';
import { getAlerts, saveAlerts } from '@/lib/pro/alertStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function proCaller(req: Request) {
  const caller = await requireUser(req);
  if (caller instanceof NextResponse) return caller;
  const { adminDb } = await import('@/lib/firebase-admin');
  const user = (await adminDb().doc(`users/${caller.uid}`).get()).data();
  if (!isProActive(user ?? null)) return fail('pro_required', 403, 'Price alerts are part of Kumami Pro.');
  return caller;
}

export const GET = handler('me/alerts', async (req: Request) => {
  const caller = await proCaller(req);
  if (caller instanceof NextResponse) return caller;
  return ok(await getAlerts(caller.uid));
});

export const PUT = handler('me/alerts/put', async (req: Request) => {
  const caller = await proCaller(req);
  if (caller instanceof NextResponse) return caller;
  if (rateLimited(`alerts:${caller.uid}`, 30, 60_000)) return fail('rate_limited', 429, 'Too many changes — try again in a minute.');
  const body = await readJson(req);
  const rearm = Array.isArray(body.rearm) ? body.rearm.map(Number).filter(Number.isFinite) : [];
  return ok(await saveAlerts(caller.uid, body.alerts, rearm));
});
