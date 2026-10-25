/**
 * Flow Radar Plus delay (15 minutes) — served from the stored event history
 * (Andrew, 22 Oct 2026; replaces the per-minute snapshots).
 *
 * flow_events holds every event with `plusAt` (rules/flowDelayed.ts). Plus gets
 * the last 24h of events whose `plusAt` is at least 15 minutes old, so the feed
 * keeps its history and is never empty after a quiet spell or a deploy.
 *
 * Who fills flow_events: the collector when a separately approved scheduler is
 * operating and, until then, the Console and Flow Radar pages. Page-triggered runs
 * are opportunistic rather than continuous.
 */
import "server-only";

import type { FlowEvent } from "./contracts";
import { runCollector } from "./collector";
import {
  delayedEvents,
  delayedFeedAsOf,
  lastSuccessfulCollection,
} from "./rules/flowDelayed";

const PAGE_RUN_EVERY_MS = 60_000;
const LOOKBACK_MS = 24 * 3_600_000; // Plus's longest window
const MAX_EVENTS = 1000;

let lastPageRun = 0;

/** Page-triggered collector run, at most once a minute. Never throws. */
export function recordFlowEvents(now = Date.now()): void {
  if (now - lastPageRun < PAGE_RUN_EVERY_MS) return;
  lastPageRun = now;
  runCollector(now, { skipIfRanWithinMs: 50_000 }).catch((err) =>
    console.error("[flowDelayed] record failed:", err),
  );
}

/**
 * The delayed Plus feed: events visible for at least `delayMinutes`, last 24h,
 * newest first. The first run already stores the live feed's older events, so
 * there's no warm-up wait. `null` = nothing was ever collected (or the read
 * failed) — callers show an honest "starting" state.
 */
export async function readDelayedFlow(
  delayMinutes: number,
  now = Date.now(),
): Promise<{ events: FlowEvent[]; asOf: number } | null> {
  const delayMs = delayMinutes * 60_000;
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    const db = adminDb();
    const [meta, snap] = await Promise.all([
      db.collection("flow_meta").doc("collector").get(),
      db
        .collection("flow_events")
        .where("plusAt", ">=", now - delayMs - LOOKBACK_MS)
        .where("plusAt", "<=", now - delayMs)
        .orderBy("plusAt", "desc")
        .limit(MAX_EVENTS)
        .get(),
    ]);
    const lastSuccessAt = lastSuccessfulCollection(meta.data());
    if (typeof meta.get("since") !== "number" || lastSuccessAt === null)
      return null;
    const stored = snap.docs.map((d) => {
      const e = d.data();
      for (const k of ["firstSeen", "lastSeen", "expireAt", "counted"])
        delete e[k]; // Firestore-only fields
      return e as FlowEvent & { plusAt: number };
    });
    return {
      events: delayedEvents(stored, now, delayMs),
      asOf: delayedFeedAsOf(now, lastSuccessAt, delayMs),
    };
  } catch (err) {
    console.error("[flowDelayed] read failed:", err);
    return null;
  }
}
