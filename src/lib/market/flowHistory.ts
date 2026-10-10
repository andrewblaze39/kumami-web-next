/**
 * Daily Flow Radar history — feeds "consistent in Flow Radar for 7 days"
 * (Watchlist Pro extra coins, Spot Pulse Pro second row; Andrew's spec v1.6).
 *
 * There is no scheduled job in this repo, so the tally is recorded whenever
 * the Flow Radar buffer refreshes (throttled to one write per 10 minutes per
 * server instance). Days on which nobody requests Flow Radar leave a gap —
 * acceptable; the ranking simply counts the days that exist.
 *
 * Storage: Firestore `flow_daily/{YYYY-MM-DD}` = { date, assets: { SYM: FlowDayTally } }.
 */
import 'server-only';

import type { FlowEvent } from './contracts';
import {
  HISTORY_DAYS, lastNDays, mergeTallies, tallyDay, utcDay,
  type FlowDailyDoc, type FlowDayTally,
} from './rules/consistentFlow';

const COLLECTION = 'flow_daily';
const THROTTLE_MS = 10 * 60_000;
let lastWrite = 0;

async function db() {
  const { adminDb } = await import('@/lib/firebase-admin');
  return adminDb();
}

/** Fold the current buffer into today's tally (field-wise max). Never throws. */
export async function recordFlowDay(events: FlowEvent[], now = Date.now()): Promise<void> {
  if (now - lastWrite < THROTTLE_MS) return;
  lastWrite = now;
  const day = utcDay(now);
  try {
    const fresh = tallyDay(events, day);
    if (Object.keys(fresh).length === 0) return;
    const store = await db();
    const ref = store.collection(COLLECTION).doc(day);
    await store.runTransaction(async (tx) => {
      const cur = await tx.get(ref);
      const stored = cur.exists ? (cur.get('assets') as Record<string, FlowDayTally>) : undefined;
      tx.set(ref, { date: day, assets: mergeTallies(stored, fresh) });
    });
  } catch (err) {
    console.error('[flowHistory] record failed:', err);
  }
}

/** The last HISTORY_DAYS daily docs (today included). Empty array on failure. */
export async function readFlowHistory(now = Date.now()): Promise<FlowDailyDoc[]> {
  const today = utcDay(now);
  const from = utcDay(now - (HISTORY_DAYS - 1) * 86_400_000);
  try {
    const store = await db();
    const snap = await store.collection(COLLECTION).where('date', '>=', from).where('date', '<=', today).get();
    return lastNDays(snap.docs.map((d) => d.data() as FlowDailyDoc), today);
  } catch (err) {
    console.error('[flowHistory] read failed:', err);
    return [];
  }
}
