/**
 * Watchlist Pro — Section C "Also Worth Watching" (Kumami Pro §2.8-2.9).
 *
 * Auto-detects assets outside the user's own anchors/custom list that are
 * showing significant activity, scored from the same Flow Radar event buffer
 * (zero new API calls). Top 5 by score, refreshed alongside the event buffer.
 *
 * Implements 3 of the spec's 5 significance criteria — the other 2 need data
 * this app doesn't have yet, documented rather than faked:
 *   - Criterion 3 "Volume Spike" (24H spot volume > 2x the asset's 7D
 *     average) needs a 7-day rolling volume baseline this codebase doesn't
 *     track anywhere.
 *   - Criterion 5 "Significance Chip Fired" depends on the per-asset
 *     baseline/significance engine (Kumami Pro §1.7), which is a separate,
 *     not-yet-built subsystem (needs a new daily scheduled job).
 * The "top 30 by market cap" score multiplier is also omitted for the same
 * reason — no market-cap ranking is fetched anywhere in this pipeline.
 *
 * Also computes per-asset Whale Accumulation / Whale Distribution tags
 * (Kumami Pro §2.9) from the same buffer — 2+ bullish/bearish whale_transfer
 * events in the window.
 */

import type { FlowEvent } from '../contracts';

const BULLISH_DIRECTIONS = new Set<FlowEvent['direction']>([
  'Outflow', 'Buy Pressure', 'Support Wall', 'Accumulation', 'Smart Money',
]);
const BEARISH_DIRECTIONS = new Set<FlowEvent['direction']>([
  'Inflow', 'Sell Pressure', 'Resistance Wall',
]);

const M50 = 50_000_000;

export type SectionCEntry = {
  asset: string;
  score: number;
  /** Human-readable "why this" reasons, most significant first. */
  reasons: string[];
};

/** Whale Accumulation / Whale Distribution tag counts, per asset. */
export function computeWhaleEventCounts(events: FlowEvent[]): Record<string, { bullish: number; bearish: number }> {
  const counts: Record<string, { bullish: number; bearish: number }> = {};
  for (const e of events) {
    if (e.type !== 'whale_transfer') continue;
    const bucket = counts[e.asset] ?? { bullish: 0, bearish: 0 };
    if (e.direction === 'Outflow') bucket.bullish += 1;
    else if (e.direction === 'Inflow') bucket.bearish += 1;
    counts[e.asset] = bucket;
  }
  return counts;
}

/** Real USD totals behind the whale tags above — for the Watchlist's Signal
 *  detail line (e.g. "$340M outflow · 24h"), never a fabricated figure. */
export function computeWhaleEventUsd(events: FlowEvent[]): Record<string, { bullishUsd: number; bearishUsd: number }> {
  const usd: Record<string, { bullishUsd: number; bearishUsd: number }> = {};
  for (const e of events) {
    if (e.type !== 'whale_transfer') continue;
    const bucket = usd[e.asset] ?? { bullishUsd: 0, bearishUsd: 0 };
    if (e.direction === 'Outflow') bucket.bullishUsd += e.amountUsd;
    else if (e.direction === 'Inflow') bucket.bearishUsd += e.amountUsd;
    usd[e.asset] = bucket;
  }
  return usd;
}

/** Per-asset smart-money (Hyperliquid whale) direction counts, for the
 *  Signal column's "Multi-signal" composite (whale + smart money aligned). */
export function computeSmartMoneyCounts(events: FlowEvent[]): Record<string, { bullish: number; bearish: number }> {
  const counts: Record<string, { bullish: number; bearish: number }> = {};
  const bullishDirections = new Set<FlowEvent['direction']>(['Smart Money', 'Outflow', 'Buy Pressure', 'Support Wall', 'Accumulation']);
  const bearishDirections = new Set<FlowEvent['direction']>(['Inflow', 'Sell Pressure', 'Resistance Wall']);
  for (const e of events) {
    if (e.type !== 'smart_money') continue;
    const bucket = counts[e.asset] ?? { bullish: 0, bearish: 0 };
    if (bullishDirections.has(e.direction)) bucket.bullish += 1;
    else if (bearishDirections.has(e.direction)) bucket.bearish += 1;
    counts[e.asset] = bucket;
  }
  return counts;
}

export function computeSectionC(
  events24h: FlowEvent[],
  excludeAssets: Set<string>,
  now: number = Date.now(),
): SectionCEntry[] {
  const byAsset = new Map<string, FlowEvent[]>();
  for (const e of events24h) {
    if (excludeAssets.has(e.asset)) continue;
    const list = byAsset.get(e.asset) ?? [];
    list.push(e);
    byAsset.set(e.asset, list);
  }

  const entries: SectionCEntry[] = [];

  for (const [asset, assetEvents] of byAsset) {
    let score = 0;
    const reasons: string[] = [];
    let criteriaMet = 0;

    // Criterion 1 — Sustained Accumulation: net exchange outflow > $50M/24H.
    const netOutflow = assetEvents
      .filter((e) => e.type === 'whale_transfer' && e.direction === 'Outflow')
      .reduce((sum, e) => sum + e.amountUsd, 0);
    if (netOutflow > M50) {
      score += 3;
      criteriaMet += 1;
      reasons.push('Sustained accumulation');
    }

    // Criterion 2 — Multi-Event Bullish Flow: 3+ bullish events, 1+ HIGH.
    const bullishEvents = assetEvents.filter((e) => BULLISH_DIRECTIONS.has(e.direction));
    if (bullishEvents.length >= 3 && bullishEvents.some((e) => e.severity === 'HIGH')) {
      score += 3;
      criteriaMet += 1;
      reasons.push('Multi-signal bullish flow');
    }

    // Criterion 4 — Coordinated Smart Money: 2+ smart_money events, same direction.
    const smartMoney = assetEvents.filter((e) => e.type === 'smart_money');
    const smartBullish = smartMoney.filter((e) => BULLISH_DIRECTIONS.has(e.direction)).length;
    const smartBearish = smartMoney.filter((e) => BEARISH_DIRECTIONS.has(e.direction)).length;
    if (smartBullish >= 2 || smartBearish >= 2) {
      score += 4;
      criteriaMet += 1;
      reasons.push('Coordinated smart money');
    }

    if (score === 0) continue;

    // Multiplier — any HIGH severity event in the last 6h.
    const sixHoursAgo = now - 6 * 3_600_000;
    if (assetEvents.some((e) => e.severity === 'HIGH' && Date.parse(e.ts) >= sixHoursAgo)) {
      score *= 1.5;
    }
    // Multiplier — multiple criteria met.
    if (criteriaMet > 1) {
      score *= criteriaMet * 0.5 + 1;
    }

    entries.push({ asset, score, reasons });
  }

  return entries.sort((a, b) => b.score - a.score).slice(0, 5);
}
