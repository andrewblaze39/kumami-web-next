/**
 * Flow Radar market-wide verdict band.
 *
 * Source: Kumami Plus §4.4 "Market Verdict Band (last 4H)":
 *   bearish_usd > $500M + count >= 3   → "Distribution Wave" (red)
 *   bullish_usd > $500M + count >= 3   → "Broad Accumulation" (green)
 *   liquidation total > $300M          → "Liquidation Cascade Detected" (amber)
 *   bullish count >= 3 AND bearish >= 3 → "Mixed Flow" (grey)
 *   else                                → "Quiet Flow" (grey)
 *
 * First-match-wins, in the order listed above (matches the doc's own ordering).
 *
 * Direction → lean mapping (per the flowRadar engine's direction vocabulary):
 *   Bullish: Outflow, Buy Pressure, Support Wall, Accumulation, Smart Money
 *   Bearish: Inflow, Sell Pressure, Resistance Wall
 */

import type { FlowEvent, Verdict } from '../contracts';

const BULLISH_DIRECTIONS = new Set<FlowEvent['direction']>([
  'Outflow', 'Buy Pressure', 'Support Wall', 'Accumulation', 'Smart Money',
]);
const BEARISH_DIRECTIONS = new Set<FlowEvent['direction']>([
  'Inflow', 'Sell Pressure', 'Resistance Wall',
]);

export type FlowVerdictResult = {
  verdict: Verdict;
  /** One-sentence interpretation, matching the Flow Radar band's copy style. */
  sentence: string;
  /** Right-aligned stat line, e.g. "$286M forced closures in 4H". */
  statLine: string;
};

const M300 = 300_000_000;
const M500 = 500_000_000;

export function computeFlowVerdict(events: FlowEvent[]): FlowVerdictResult {
  let bullishUsd = 0, bearishUsd = 0, bullishCount = 0, bearishCount = 0, liqTotal = 0;

  for (const e of events) {
    if (BULLISH_DIRECTIONS.has(e.direction)) {
      bullishUsd += e.amountUsd;
      bullishCount++;
    } else if (BEARISH_DIRECTIONS.has(e.direction)) {
      bearishUsd += e.amountUsd;
      bearishCount++;
    }
    if (e.type === 'liq_spike') liqTotal += e.amountUsd;
  }

  const fmt = (n: number) => `$${(n / 1_000_000).toFixed(0)}M`;

  if (bearishUsd > M500 && bearishCount >= 3) {
    return {
      verdict: { label: 'Distribution Wave', color: 'red' },
      sentence: 'Large holders are moving to exchanges — watch for follow-through selling.',
      statLine: `${fmt(bearishUsd)} distribution across ${bearishCount} events`,
    };
  }

  if (bullishUsd > M500 && bullishCount >= 3) {
    return {
      verdict: { label: 'Broad Accumulation', color: 'green' },
      sentence: 'Whales and smart money are net accumulating — a bullish tilt across the tape.',
      statLine: `${fmt(bullishUsd)} accumulation across ${bullishCount} events`,
    };
  }

  if (liqTotal > M300) {
    return {
      verdict: { label: 'Liquidation Cascade Detected', color: 'amber' },
      sentence: 'Forced selling is driving price, not conviction — cascades this size tend to mark a local flush rather than the start of a trend.',
      statLine: `${fmt(liqTotal)} forced closures in 4H`,
    };
  }

  if (bullishCount >= 3 && bearishCount >= 3) {
    return {
      verdict: { label: 'Mixed Flow', color: 'grey' },
      sentence: 'Bullish and bearish flow are roughly balanced — no clear directional edge right now.',
      statLine: `${bullishCount} bullish · ${bearishCount} bearish events`,
    };
  }

  return {
    verdict: { label: 'Quiet Flow', color: 'grey' },
    sentence: 'Nothing unusual in the last window — flow is calm.',
    statLine: `${events.length} event${events.length === 1 ? '' : 's'} tracked`,
  };
}
