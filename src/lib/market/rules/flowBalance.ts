/**
 * Flow Radar Pro — Flow Balance Panel (Kumami Pro §1.5).
 *
 * Directional pressure over the last 24H: bullish $ vs bearish $, a net
 * figure, and a verdict label. Reuses the same bullish/bearish direction
 * vocabulary as the Market Verdict Band (flowVerdict.ts) — same events, a
 * different lens (magnitude/balance over a fixed 24H window, not a "what
 * happened just now" read over the user's selected timeframe).
 */

import type { FlowEvent } from '../contracts';

const BULLISH_DIRECTIONS = new Set<FlowEvent['direction']>([
  'Outflow', 'Buy Pressure', 'Support Wall', 'Accumulation', 'Smart Money',
]);
const BEARISH_DIRECTIONS = new Set<FlowEvent['direction']>([
  'Inflow', 'Sell Pressure', 'Resistance Wall',
]);

export type FlowBalanceVerdict =
  | 'Strong Accumulation'
  | 'Accumulation'
  | 'Balanced'
  | 'Distribution'
  | 'Heavy Distribution';

export type FlowBalanceResult = {
  bullishUsd: number;
  bearishUsd: number;
  netUsd: number;
  /** 0-100, sums to 100 across the two (50/50 when both sides are zero). */
  bullishPct: number;
  bearishPct: number;
  verdict: FlowBalanceVerdict;
};

const M100 = 100_000_000;
const M500 = 500_000_000;

export function computeFlowBalance(events24h: FlowEvent[]): FlowBalanceResult {
  let bullishUsd = 0;
  let bearishUsd = 0;

  for (const e of events24h) {
    if (BULLISH_DIRECTIONS.has(e.direction)) bullishUsd += e.amountUsd;
    else if (BEARISH_DIRECTIONS.has(e.direction)) bearishUsd += e.amountUsd;
  }

  const netUsd = bullishUsd - bearishUsd;
  const total = bullishUsd + bearishUsd;
  const bullishPct = total > 0 ? Math.round((bullishUsd / total) * 100) : 50;
  const bearishPct = 100 - bullishPct;

  let verdict: FlowBalanceVerdict;
  if (netUsd > M500) verdict = 'Strong Accumulation';
  else if (netUsd > M100) verdict = 'Accumulation';
  else if (netUsd >= -M100) verdict = 'Balanced';
  else if (netUsd >= -M500) verdict = 'Distribution';
  else verdict = 'Heavy Distribution';

  return { bullishUsd, bearishUsd, netUsd, bullishPct, bearishPct, verdict };
}
