/**
 * Background collector — runs once per call of POST /api/v1/cron/collect, which
 * Cloud Scheduler hits every 60 s (Rachelle v1.15 Platform). Folds the live Flow
 * Radar events into flow_events + flow_hourly (rules/collector.ts) and deletes
 * documents older than 7 days. Also records the daily tally (flow_daily) so the
 * existing 7-day / 3-day history no longer depends on someone opening a page.
 *
 * Cost: one Flow Radar build (~10 CoinGlass calls, shared with the pages through
 * the 60 s buffer cache) per run.
 */
import "server-only";

import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { FlowEvent } from "./contracts";
import { getCachedFresh } from "./cache";
import { getProvider } from "./provider";
import { recordFlowDay } from "./flowHistory";
import {
  eventKey,
  foldEvent,
  hourlyDeltas,
  RETENTION_MS,
  type StoredEvent,
} from "./rules/collector";
import {
  decideCollectorLease,
  ownsCollectorLease,
  type CollectorLeaseMeta,
} from "./rules/collectorLease";
import { plusVisibleAt } from "./rules/flowDelayed";

export type CollectorResult = {
  events: number;
  created: number;
  updated: number;
  hourly: number;
  deleted: number;
  ms: number;
};

const DELETE_BATCH = 200;
// Two scheduler intervals: avoid overlapping writes when an upstream call is slow.
const LEASE_MS = 120_000;

/**
 * One collector run. `skipIfRanWithinMs`: the pages also trigger runs (see
 * flowDelayed.ts), so they skip when any run — cron or page — happened that
 * recently; returns null when skipped. flow_meta/collector records the last run
 * and `since` (the first run ever), which tells the Plus feed history exists.
 */
export async function runCollector(
  now = Date.now(),
  opts: { skipIfRanWithinMs?: number } = {},
): Promise<CollectorResult | null> {
  const t0 = Date.now();
  const { adminDb } = await import("@/lib/firebase-admin");
  const db = adminDb();

  const metaRef = db.collection("flow_meta").doc("collector");
  const runId = randomUUID();
  const lease = await db.runTransaction(async (tx) => {
    const meta = (await tx.get(metaRef)).data() as
      CollectorLeaseMeta | undefined;
    const decision = decideCollectorLease(
      meta,
      now,
      runId,
      LEASE_MS,
      opts.skipIfRanWithinMs,
    );
    if (decision.kind === "acquired")
      tx.set(metaRef, decision.patch, { merge: true });
    return decision;
  });
  if (lease.kind !== "acquired") return null;

  try {
    const events: FlowEvent[] = await getCachedFresh(
      "market:v3:flow-radar",
      60,
      () => getProvider().flowRadar("pro"),
    );
    await recordFlowDay(events, now);

    const refs = events.map((e) =>
      db.collection("flow_events").doc(eventKey(e.id)),
    );
    const snaps = refs.length ? await db.getAll(...refs) : [];
    const expireAt = (ts: string) =>
      Timestamp.fromMillis(Date.parse(ts) + RETENTION_MS);

    let created = 0,
      updated = 0;
    const adds: { e: FlowEvent; add: number }[] = [];
    const batch = db.batch();
    events.forEach((e, i) => {
      const prev = snaps[i]?.exists
        ? (snaps[i].data() as StoredEvent & { plusAt?: number })
        : undefined;
      const f = foldEvent(prev, e);
      const plusAt = plusVisibleAt(prev, e, now);
      if (
        prev &&
        prev.amountUsd === f.amountUsd &&
        prev.direction === e.direction &&
        prev.plusAt === plusAt
      )
        return; // nothing new
      if (prev) updated++;
      else created++;
      batch.set(
        refs[i],
        {
          ...e,
          amountUsd: f.amountUsd,
          counted: f.counted,
          lastSeen: Timestamp.fromMillis(now),
          ...(prev ? {} : { firstSeen: Timestamp.fromMillis(now) }),
          ...(plusAt !== undefined ? { plusAt } : {}),
          expireAt: expireAt(e.ts),
        },
        { merge: true },
      );
      adds.push({ e, add: f.addToHourly });
    });

    const deltas = hourlyDeltas(adds);
    for (const d of deltas) {
      batch.set(
        db.collection("flow_hourly").doc(eventKey(d.key)),
        {
          hour: d.hour,
          asset: d.asset,
          bullishUsd: FieldValue.increment(d.bullishUsd),
          bearishUsd: FieldValue.increment(d.bearishUsd),
          expireAt: Timestamp.fromMillis(
            Date.parse(`${d.hour}:00:00Z`) + RETENTION_MS,
          ),
        },
        { merge: true },
      );
    }
    if (created + updated + deltas.length > 0) await batch.commit();

    // 7-day retention (also set a Firestore TTL policy on `expireAt` — see docs/DATABASE.md).
    let deleted = 0;
    for (const coll of ["flow_events", "flow_hourly"]) {
      const old = await db
        .collection(coll)
        .where("expireAt", "<", Timestamp.fromMillis(now))
        .limit(DELETE_BATCH)
        .get();
      if (old.empty) continue;
      const del = db.batch();
      old.docs.forEach((d) => del.delete(d.ref));
      await del.commit();
      deleted += old.size;
    }

    const result = {
      events: events.length,
      created,
      updated,
      hourly: deltas.length,
      deleted,
      ms: Date.now() - t0,
    };
    await db.runTransaction(async (tx) => {
      const meta = (await tx.get(metaRef)).data() as
        CollectorLeaseMeta | undefined;
      if (!ownsCollectorLease(meta, runId)) return;
      tx.set(
        metaRef,
        {
          lastSuccessAt: Date.now(),
          lastDurationMs: result.ms,
          lastError: FieldValue.delete(),
          lastErrorAt: FieldValue.delete(),
          leaseId: FieldValue.delete(),
          leaseUntil: FieldValue.delete(),
        },
        { merge: true },
      );
    });
    return result;
  } catch (err) {
    await db
      .runTransaction(async (tx) => {
        const meta = (await tx.get(metaRef)).data() as
          CollectorLeaseMeta | undefined;
        if (!ownsCollectorLease(meta, runId)) return;
        tx.set(
          metaRef,
          {
            lastErrorAt: Date.now(),
            // Never persist a raw upstream error here: it may carry sensitive request context.
            lastError: "collector_failed",
            leaseId: FieldValue.delete(),
            leaseUntil: FieldValue.delete(),
          },
          { merge: true },
        );
      })
      .catch(() => undefined);
    throw err;
  }
}
