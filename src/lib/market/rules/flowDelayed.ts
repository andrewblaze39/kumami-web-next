/**
 * Flow Radar Plus delay — pure part (Andrew, 22 Oct 2026).
 *
 * Every Flow Radar event is stored once in flow_events (lib/market/collector.ts).
 * An event that Plus may see (5 core coins or market-wide, HIGH/MED, one of the 4
 * Plus types) also gets `plusAt`: the time it became visible to the world. Plus is
 * served every stored event whose `plusAt` is at least 15 minutes old, so the
 * delayed feed keeps its history and is never empty after a quiet spell.
 *
 *   plusAt = earlier of the event's own time and when we first saw it
 *            (a whale transfer found 30 min late is already 30 min old);
 *            an event that only later grows into MED/HIGH gets the time it did.
 */

import type { FlowEvent } from "../contracts";

export const PLUS_ASSETS = ["BTC", "ETH", "SOL", "BNB", "HYPE"];
// Rachelle v1.15 Plus §3: the 4 Plus events (Exchange Flow = Dry Powder);
// Pro also keeps Netflow Flip.
export const PLUS_EVENT_TYPES: FlowEvent["type"][] = [
  "whale_transfer",
  "exchange_flow",
  "liq_spike",
  "smart_money",
];

export function isPlusEligible(e: FlowEvent): boolean {
  return (
    PLUS_EVENT_TYPES.includes(e.type) &&
    (e.marketWide === true || PLUS_ASSETS.includes(e.asset)) &&
    (e.severity === "HIGH" || e.severity === "MED")
  );
}

/** The `plusAt` (ms) to store for a sighting; undefined while Plus may not see it. */
export function plusVisibleAt(
  prev: { plusAt?: number } | undefined,
  e: FlowEvent,
  now: number,
): number | undefined {
  if (prev?.plusAt !== undefined) return prev.plusAt;
  if (!isPlusEligible(e)) return undefined;
  if (prev) return now; // grew into a Plus event just now
  const t = Date.parse(e.ts);
  return Number.isFinite(t) ? Math.min(t, now) : now;
}

export function lastSuccessfulCollection(
  meta:
    | {
        lastSuccessAt?: unknown;
        lastRun?: unknown;
      }
    | undefined,
): number | null {
  if (typeof meta?.lastSuccessAt === "number") return meta.lastSuccessAt;
  return typeof meta?.lastRun === "number" ? meta.lastRun : null;
}

export function delayedFeedAsOf(
  now: number,
  lastSuccessAt: number,
  delayMs: number,
): number {
  return Math.min(now, lastSuccessAt) - delayMs;
}

/**
 * The delayed Plus feed from stored events: visible for at least `delayMs`, newest
 * first. Each event's time is shown as no later than `plusAt`, so an hourly event
 * re-stamped on every rebuild still reads as at least 15 minutes old.
 */
export function delayedEvents(
  stored: (FlowEvent & { plusAt: number })[],
  now: number,
  delayMs: number,
): FlowEvent[] {
  return stored
    .filter((s) => s.plusAt <= now - delayMs)
    .map(({ plusAt, ...e }) => {
      const t = Date.parse(e.ts);
      return Number.isFinite(t) && t <= plusAt
        ? e
        : { ...e, ts: new Date(plusAt).toISOString() };
    })
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
}
