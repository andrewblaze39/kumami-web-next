/**
 * Flow Radar direction buckets — one vocabulary for the verdict band, Flow
 * Balance, cross-signals, Watchlist signals and the 7-day history
 * (Rachelle v1.15 Plus §3 "Buckets").
 *
 *   Bullish: Outflow, Dry Powder In, Short Squeeze, Long Opened
 *   Bearish: Inflow, Dry Powder Out, Long Flush, Short Opened
 *   Neutral (shown, never counted): Two-sided Flush, Position Closed
 *
 * Netflow Flip (Buy/Sell Pressure) and the order-book walls keep their old lean.
 * Legacy labels from stored history: 'Smart Money' was an opened long (bullish);
 * 'Accumulation' was an opened SHORT mislabelled as buying, so it is neutral now.
 */

import type { FlowEvent } from '../contracts';

type Dir = FlowEvent['direction'];

export const BULLISH_DIRECTIONS = new Set<Dir>([
  'Outflow', 'Dry Powder In', 'Short Squeeze', 'Long Opened',
  'Buy Pressure', 'Support Wall', 'Smart Money',
]);
export const BEARISH_DIRECTIONS = new Set<Dir>([
  'Inflow', 'Dry Powder Out', 'Long Flush', 'Short Opened',
  'Sell Pressure', 'Resistance Wall',
]);
export const NEUTRAL_DIRECTIONS = new Set<Dir>(['Two-sided Flush', 'Position Closed', 'Accumulation']);

export type FlowLean = 'bullish' | 'bearish' | 'neutral';

export function flowLean(direction: Dir): FlowLean {
  if (BULLISH_DIRECTIONS.has(direction)) return 'bullish';
  if (BEARISH_DIRECTIONS.has(direction)) return 'bearish';
  return 'neutral';
}
