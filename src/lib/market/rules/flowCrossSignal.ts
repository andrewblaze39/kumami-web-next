/**
 * Flow Radar cross-signal outlines — Rachelle v1.15 Plus §3 (now on Plus AND Pro,
 * same rules). Reuses other panels' already-cached reads; first match wins,
 * one coloured row outline per event.
 *
 *   1. Whale Outflow + Spot Pulse REAL BUYING / ACCUMULATION     → green "Spot Pulse confirming"
 *   2. Long Flush + Bearish regime                               → red   "Regime confirming"
 *      Short Squeeze + Bullish regime                            → green "Regime confirming"
 *   3. Long Opened + 2 or more bullish whale events in 24h       → green "Watchlist confirming"
 *      Short Opened + 2 or more bearish whale events in 24h      → red   "Watchlist confirming"
 *   4. Fallback: Whale Outflow + Fear / Extreme Fear             → green "Regime shift confirming"
 */

import type { FlowEvent } from '../contracts';

const FEAR_LABELS = new Set(['Fear', 'Extreme Fear']);
const BULLISH_SPOT_PULSE = new Set(['REAL BUYING', 'ACCUMULATION']);

export type FlowCrossSignalContext = {
  /** Per-asset Spot Pulse tile verdict, e.g. { BTC: 'REAL BUYING' }. */
  spotPulseVerdictByAsset?: Record<string, string>;
  /** Per-asset Console regime chip read, e.g. { BTC: 'Bearish' }. */
  consoleRegimeByAsset?: Record<string, 'Bullish' | 'Neutral' | 'Bearish'>;
  /** Per-asset whale-transfer counts over 24h (the Watchlist's Whale Accumulation / Distribution source). */
  whaleCounts24hByAsset?: Record<string, { bullish: number; bearish: number }>;
  /** Fear & Greed composite label snapshot. */
  fearGreedLabel?: string;
};

export function computeFlowCrossSignal(
  event: Pick<FlowEvent, 'type' | 'direction' | 'asset'>,
  ctx: FlowCrossSignalContext,
): FlowEvent['crossSignal'] {
  const { type, direction, asset } = event;

  // 1 — Whale outflow confirmed by spot buying.
  if (type === 'whale_transfer' && direction === 'Outflow') {
    const spot = ctx.spotPulseVerdictByAsset?.[asset];
    if (spot && BULLISH_SPOT_PULSE.has(spot)) return { label: 'Spot Pulse confirming', color: 'green' };
  }

  // 2 — Liquidations in the direction of the regime.
  if (type === 'liq_spike') {
    const regime = ctx.consoleRegimeByAsset?.[asset];
    if (direction === 'Long Flush' && regime === 'Bearish') return { label: 'Regime confirming', color: 'red' };
    if (direction === 'Short Squeeze' && regime === 'Bullish') return { label: 'Regime confirming', color: 'green' };
  }

  // 3 — Smart money in the direction of repeated whale flow.
  if (type === 'smart_money') {
    const c = ctx.whaleCounts24hByAsset?.[asset];
    if (direction === 'Long Opened' && (c?.bullish ?? 0) >= 2) return { label: 'Watchlist confirming', color: 'green' };
    if (direction === 'Short Opened' && (c?.bearish ?? 0) >= 2) return { label: 'Watchlist confirming', color: 'red' };
  }

  // 4 — Fallback: whale outflow while the crowd is fearful.
  if (type === 'whale_transfer' && direction === 'Outflow' && ctx.fearGreedLabel && FEAR_LABELS.has(ctx.fearGreedLabel)) {
    return { label: 'Regime shift confirming', color: 'green' };
  }

  return undefined;
}
