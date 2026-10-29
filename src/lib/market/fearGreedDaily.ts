/**
 * Daily save of Kumami's Fear & Greed score (Rachelle v1.17 Plus §4, "same mechanism as the
 * collector"): the cron collector route calls recordFearGreedDay every minute; it writes
 * fear_greed_daily/{YYYY-MM-DD} once per UTC day. An unavailable index is never saved
 * (no stand-in values). The Fear & Greed page reads the saved days (rules/fearGreedHistory).
 */
import 'server-only';

import { fearGreedDayKey, type SavedFearGreedDay } from './rules/fearGreedHistory';
import { getFearGreedIndex } from './fearGreedIndex';

export const FEAR_GREED_DAILY = 'fear_greed_daily';

/** Per server instance: the day already confirmed saved, so most runs cost no Firestore read. */
let confirmedDay: string | null = null;

export async function recordFearGreedDay(now = Date.now()): Promise<'saved' | 'exists' | 'unavailable'> {
  const day = fearGreedDayKey(now);
  if (confirmedDay === day) return 'exists';
  const { adminDb } = await import('@/lib/firebase-admin');
  const ref = adminDb().collection(FEAR_GREED_DAILY).doc(day);
  if ((await ref.get()).exists) { confirmedDay = day; return 'exists'; }
  const fg = await getFearGreedIndex();
  if (fg.composite.unavailable) return 'unavailable';
  await ref.set({
    date: day,
    score: fg.composite.score,
    label: fg.composite.label,
    color: fg.composite.color,
    savedAt: new Date(now).toISOString(),
  });
  confirmedDay = day;
  return 'saved';
}

/** The saved days, newest first (at most ~13 months). */
export async function readFearGreedDays(limit = 400): Promise<SavedFearGreedDay[]> {
  const { adminDb } = await import('@/lib/firebase-admin');
  const snap = await adminDb().collection(FEAR_GREED_DAILY).orderBy('date', 'desc').limit(limit).get();
  return snap.docs.map((d) => ({ date: String(d.get('date')), score: Number(d.get('score')) }));
}
