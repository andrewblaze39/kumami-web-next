/**
 * Flow Radar snapshots — powers the Flow Radar Plus delay (Andrew's spec
 * v1.6, Plus §3: 15 minutes).
 *
 * Why snapshots: netflow-flip and liquidation-spike events are stamped with
 * the fetch time on every rebuild, so "hide events newer than 15 min" removed
 * them entirely and Plus saw an almost empty feed. Instead, every buffer
 * refresh saves the full event list under its minute bucket, and Plus is
 * served the newest snapshot that is at least 15 minutes old.
 *
 * Storage: Firestore `flow_snapshots/{bucketMs}` = { bucket, events, savedAt }.
 * At most one write per minute per server instance; snapshots older than an
 * hour are deleted (best effort, about every 10 minutes).
 */
import 'server-only';

import type { FlowEvent } from './contracts';
import { pickSnapshot } from './gating';

const COLLECTION = 'flow_snapshots';
const KEEP_MS = 60 * 60_000;
const CLEANUP_EVERY_MS = 10 * 60_000;

let lastSavedBucket = 0;
let lastCleanup = 0;

async function db() {
  const { adminDb } = await import('@/lib/firebase-admin');
  return adminDb();
}

const minuteBucket = (t: number) => Math.floor(t / 60_000) * 60_000;

/** Save the current buffer as this minute's snapshot (no-op if already saved this minute). Never throws. */
export async function saveFlowSnapshot(events: FlowEvent[], now = Date.now()): Promise<void> {
  const bucket = minuteBucket(now);
  if (bucket === lastSavedBucket) return;
  lastSavedBucket = bucket;
  try {
    const store = await db();
    await store.collection(COLLECTION).doc(String(bucket)).set({ bucket, events, savedAt: now });
    if (now - lastCleanup > CLEANUP_EVERY_MS) {
      lastCleanup = now;
      const old = await store.collection(COLLECTION).where('bucket', '<', now - KEEP_MS).limit(200).get();
      await Promise.all(old.docs.map((d) => d.ref.delete()));
    }
  } catch (err) {
    console.error('[flowSnapshots] save failed:', err);
  }
}

/**
 * The delayed feed for Flow Radar Plus: the newest snapshot ≥ delayMinutes old
 * (looking back at most 10 extra minutes). `null` = no qualifying snapshot yet
 * (e.g. right after a cold start) — callers show an honest "starting" state.
 */
export async function readDelayedFlow(delayMinutes: number, now = Date.now()): Promise<{ events: FlowEvent[]; asOf: number } | null> {
  const delayMs = delayMinutes * 60_000;
  try {
    const store = await db();
    const snap = await store
      .collection(COLLECTION)
      .where('bucket', '<=', now - delayMs)
      .orderBy('bucket', 'desc')
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    const bucket = Number(doc.get('bucket'));
    if (pickSnapshot([bucket], now, delayMs) === null) return null;
    return { events: (doc.get('events') ?? []) as FlowEvent[], asOf: bucket };
  } catch (err) {
    console.error('[flowSnapshots] read failed:', err);
    return null;
  }
}
