/**
 * Live Calendar payload — the ONE calendar, shown at /world/calendar for both
 * Plus and Pro (Pro's old separate admin-only Calendar tab now redirects here).
 *
 * Source: Kumami Plus §7 "CALENDAR". Merges three sources:
 *   macro events  ← CoinGlass /api/calendar/economic-data (30d back → 60d ahead)
 *   token unlocks ← CoinGlass /api/coin/unlock-list, dated on each token's NEXT unlock
 *   team events   ← Firestore pro_calendar (status == 'published'), authored at
 *                   /admin/pro-calendar — the spec's editorial pipeline. Admins
 *                   add/edit/delete there; drafts never show.
 *
 * Freshness: the two CoinGlass feeds are cached per endpoint (30 min, shared
 * with Intelligence). The Firestore read is NOT cached, so an admin publish,
 * edit or delete shows up on the next page load / poll instead of up to 30
 * minutes later.
 *
 * Failure handling: each source degrades independently to an empty list — the
 * day grid still renders every date, so a dead feed never fakes data and
 * never takes the admin events down with it (and vice versa).
 */

import 'server-only';

import type { CalendarEvent, CalendarPayload } from '../contracts';
import { economicCalendar, coinUnlocks } from './cg-endpoints';
import {
  adminToEvent,
  macroToEvent,
  mergeCalendarEvents,
  unlockToEvent,
  type AdminCalendarDoc,
} from '../rules/calendarEvents';

async function adminEvents(): Promise<CalendarEvent[]> {
  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    const snap = await adminDb().collection('pro_calendar').where('status', '==', 'published').get();
    return snap.docs
      .map((d) => adminToEvent(d.id, d.data() as AdminCalendarDoc))
      .filter((e): e is CalendarEvent => e !== null);
  } catch (err) {
    console.error('[calendar] admin events (pro_calendar) unavailable:', err);
    return [];
  }
}

/**
 * Admin switches for the automatic CoinGlass feeds (Andrew, 10 Oct 2026 —
 * both OFF for now). Firestore `pro_settings/calendar` = { macroFeed, unlockFeed };
 * a missing doc or field means OFF. Toggled at the top of /admin/pro-calendar.
 * A switched-off feed disappears everywhere this payload is used (Calendar
 * page, Console preview, D-1 and "Needs your attention" popups).
 */
export type CalendarFeedSettings = { macroFeed: boolean; unlockFeed: boolean };

async function feedSettings(): Promise<CalendarFeedSettings> {
  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    const d = (await adminDb().collection('pro_settings').doc('calendar').get()).data() ?? {};
    return { macroFeed: d.macroFeed === true, unlockFeed: d.unlockFeed === true };
  } catch (err) {
    console.error('[calendar] feed settings unavailable — treating feeds as OFF:', err);
    return { macroFeed: false, unlockFeed: false };
  }
}

export async function makeCalendarPayloadLive(): Promise<CalendarPayload> {
  const settings = await feedSettings();
  const [calendar, unlocks, team] = await Promise.all([
    settings.macroFeed ? economicCalendar().catch(() => []) : Promise.resolve([]),
    settings.unlockFeed ? coinUnlocks().catch(() => []) : Promise.resolve([]),
    adminEvents(),
  ]);

  const macro = calendar.map(macroToEvent);
  const unlock = unlocks.map(unlockToEvent).filter((e): e is CalendarEvent => e !== null);

  return { events: mergeCalendarEvents(macro, unlock, team), updatedAt: new Date().toISOString(), feeds: settings };
}
