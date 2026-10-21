/**
 * Flow Radar market-wide verdict band — Rachelle v1.15 Plus §3 (Plus + Pro).
 *
 * First match wins. Dollar thresholds are the 4H base and scale with the
 * window: 1H ×0.5 · 4H ×1 · 24H ×2.5 (7D ×10 — Pro only, not in the spec).
 *   1. liquidations > $300M          → "Long Liquidation Cascade" (longs ≥ half)
 *                                       or "Short Squeeze Cascade"     (amber)
 *   2. bearish > $500M, ≥ 3 events, bearish ≥ 1.5× bullish → "Distribution Wave" (red)
 *   3. bullish > $500M, ≥ 3 events, bullish ≥ 1.5× bearish → "Broad Accumulation" (green)
 *   4. ≥ 3 bullish AND ≥ 3 bearish events                  → "Mixed Flow" (grey)
 *   5. otherwise                                           → "Quiet Flow" (grey)
 *
 * v1.14 checked distribution first with no comparison, so $600M of selling
 * against $900M of buying read "Distribution". Neutral events (Two-sided
 * Flush, closed positions) are shown in the feed but never counted.
 */

import type { FlowEvent, Verdict } from '../contracts';
import { flowLean } from './flowDirections';

export { BULLISH_DIRECTIONS, BEARISH_DIRECTIONS } from './flowDirections';

export type FlowWindow = '1H' | '4H' | '24H' | '7D';
export const WINDOW_SCALE: Record<FlowWindow, number> = { '1H': 0.5, '4H': 1, '24H': 2.5, '7D': 10 };

export type FlowVerdictResult = {
  verdict: Verdict;
  /** One-sentence interpretation, matching the Flow Radar band's copy style. */
  sentence: string;
  /** Right-aligned stat line, e.g. "$286M forced closures in 4H". */
  statLine: string;
};

const M300 = 300_000_000;
const M500 = 500_000_000;
const DOMINANCE = 1.5;

export function computeFlowVerdict(events: FlowEvent[], window: FlowWindow = '4H'): FlowVerdictResult {
  const scale = WINDOW_SCALE[window];
  let bullishUsd = 0, bearishUsd = 0, bullishCount = 0, bearishCount = 0;
  let liqTotal = 0, liqLongUsd = 0;

  for (const e of events) {
    const lean = flowLean(e.direction);
    if (lean === 'bullish') { bullishUsd += e.amountUsd; bullishCount++; }
    else if (lean === 'bearish') { bearishUsd += e.amountUsd; bearishCount++; }
    if (e.type === 'liq_spike') {
      liqTotal += e.amountUsd;
      liqLongUsd += e.amountUsd * (e.longShare ?? (e.direction === 'Long Flush' ? 1 : e.direction === 'Short Squeeze' ? 0 : 0.5));
    }
  }

  const fmt = (n: number) => `$${(n / 1_000_000).toFixed(0)}M`;

  if (liqTotal > M300 * scale) {
    const longs = liqLongUsd >= liqTotal / 2;
    return {
      verdict: { label: longs ? 'Long Liquidation Cascade' : 'Short Squeeze Cascade', color: 'amber' },
      sentence: longs
        ? 'Forced long closures are driving price, not conviction — cascades this size tend to mark a local flush.'
        : 'Shorts are being forced out — a squeeze can push price up fast, then fade once the fuel is gone.',
      statLine: `${fmt(liqTotal)} forced closures in ${window}`,
    };
  }

  if (bearishUsd > M500 * scale && bearishCount >= 3 && bearishUsd >= DOMINANCE * bullishUsd) {
    return {
      verdict: { label: 'Distribution Wave', color: 'red' },
      sentence: 'Selling flow clearly outweighs buying — watch for follow-through.',
      statLine: `${fmt(bearishUsd)} bearish vs ${fmt(bullishUsd)} bullish`,
    };
  }

  if (bullishUsd > M500 * scale && bullishCount >= 3 && bullishUsd >= DOMINANCE * bearishUsd) {
    return {
      verdict: { label: 'Broad Accumulation', color: 'green' },
      sentence: 'Buying flow clearly outweighs selling — a bullish tilt across the tape.',
      statLine: `${fmt(bullishUsd)} bullish vs ${fmt(bearishUsd)} bearish`,
    };
  }

  if (bullishCount >= 3 && bearishCount >= 3) {
    return {
      verdict: { label: 'Mixed Flow', color: 'grey' },
      sentence: 'Bullish and bearish flow are both active — no clear directional edge right now.',
      statLine: `${bullishCount} bullish · ${bearishCount} bearish events`,
    };
  }

  return {
    verdict: { label: 'Quiet Flow', color: 'grey' },
    sentence: 'Nothing unusual in this window — flow is calm.',
    statLine: `${events.length} event${events.length === 1 ? '' : 's'} tracked`,
  };
}
