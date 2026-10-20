/**
 * Background collector — pure part (Rachelle v1.15 Platform).
 *
 * Every run folds the current Flow Radar events into two Firestore collections,
 * both kept 7 days:
 *   flow_events/{key}         one document per event (unique key = the event id:
 *                             tx hash, coin+hour, exchange+token+hour…). A repeat
 *                             sighting updates it: liquidations keep their PEAK hour
 *                             value, Dry Powder keeps the LATEST net.
 *   flow_hourly/{hour}_{coin} bullish / bearish $ per coin per hour (by event time),
 *                             the source for Watchlist Section C and Spot Pulse jobs.
 * Market-wide (Dry Powder) and neutral events are stored in flow_events but never
 * added to a coin's hourly buckets.
 */

import type { FlowEvent } from '../contracts';
import { flowLean } from './flowDirections';

export const RETENTION_MS = 7 * 24 * 3_600_000;

/** Firestore-safe document id (no "/", bounded length). */
export function eventKey(id: string): string {
  return id.replace(/[/\\#?[\]]/g, '_').slice(0, 300);
}

export const hourOf = (ts: string): string => new Date(ts).toISOString().slice(0, 13); // 2026-10-21T03

export type StoredEvent = Pick<FlowEvent, 'amountUsd' | 'direction'> & { counted?: number };

/**
 * The amount a new sighting should store, and how much more of it to add to the
 * hourly bucket. Liquidations (and every other type) keep the peak; Dry Powder
 * keeps the latest net. `counted` = what was already added to flow_hourly.
 */
export function foldEvent(prev: StoredEvent | undefined, e: FlowEvent): { amountUsd: number; addToHourly: number; counted: number } {
  const amountUsd = e.type === 'exchange_flow' || !prev ? e.amountUsd : Math.max(prev.amountUsd, e.amountUsd);
  const countable = !e.marketWide && flowLean(e.direction) !== 'neutral';
  const already = prev?.counted ?? 0;
  // A direction change within the hour (e.g. a flush flipping sides) moves the
  // whole amount to the new side: the old side keeps what was counted — rare,
  // and bounded to that hour.
  const counted = countable ? Math.max(already, amountUsd) : already;
  return { amountUsd, addToHourly: counted - already, counted };
}

export type HourlyDelta = { key: string; hour: string; asset: string; bullishUsd: number; bearishUsd: number };

/** Sum the hourly increments per (hour, coin). */
export function hourlyDeltas(items: { e: FlowEvent; add: number }[]): HourlyDelta[] {
  const m = new Map<string, HourlyDelta>();
  for (const { e, add } of items) {
    if (add <= 0) continue;
    const lean = flowLean(e.direction);
    if (lean === 'neutral' || e.marketWide) continue;
    const hour = hourOf(e.ts);
    const key = `${hour}_${e.asset}`;
    const d = m.get(key) ?? { key, hour, asset: e.asset, bullishUsd: 0, bearishUsd: 0 };
    if (lean === 'bullish') d.bullishUsd += add;
    else d.bearishUsd += add;
    m.set(key, d);
  }
  return [...m.values()];
}
