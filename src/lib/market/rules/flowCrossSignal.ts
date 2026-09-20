/**
 * Flow Radar cross-signal amplification (Pro tier only).
 *
 * Kumami Pro §1.8 specs 3 cross-signal rules that reuse other panels' already
 * -cached data (no new API calls, cross-signal state cached with the event
 * buffer at 60s TTL). Rendered as a subtle colored row outline only — no
 * stacked chip, no extra descriptor text (kept visually separate from the
 * per-asset "significance" chip, which is a different, not-yet-built system).
 *
 * Rule 1 — Whale Transfer (bullish outflow) + Spot Pulse REAL BUYING/ACCUMULATION → green
 * Rule 2 — Liquidation Spike (bearish) + Console regime Bearish → red
 * Rule 3 — Smart Money (bullish/long) + Watchlist Whale Accumulation tag → green
 *   (implemented once Watchlist Pro's Whale Accumulation/Distribution tags exist)
 *
 * First-match-wins (only one outline per row). Falls back to the pre-existing
 * Fear & Greed check below when none of the 3 above fire — that one predates
 * this doc revision and isn't one of its 3 named rules, but is kept as an
 * additional, lower-priority signal rather than deleted.
 *
 * Liquidation Spike simplification: the current builder always classifies
 * liq_spike events as bearish ("Sell Pressure") — it doesn't yet distinguish
 * Mass Long Flush vs. Short Squeeze by long/short ratio (a separate, larger
 * gap in flowRadar.ts). Rule 2 below is written against the data that exists
 * today: any liq_spike event (all bearish) + a Bearish Console regime.
 */

import type { FlowEvent } from '../contracts';

const FEAR_LABELS = new Set(['Fear', 'Extreme Fear']);
const BULLISH_SPOT_PULSE = new Set(['REAL BUYING', 'ACCUMULATION']);

export type FlowCrossSignalContext = {
  /** Per-asset Spot Pulse tile verdict, e.g. { BTC: 'REAL BUYING' }. */
  spotPulseVerdictByAsset?: Record<string, string>;
  /** Per-asset Console regime chip read, e.g. { BTC: 'Bearish' }. */
  consoleRegimeByAsset?: Record<string, 'Bullish' | 'Neutral' | 'Bearish'>;
  /** Per-asset Watchlist action-tag labels currently showing, e.g. { BTC: ['Whale Accumulation'] }. */
  watchlistTagsByAsset?: Record<string, string[]>;
  /** Fear & Greed composite label snapshot (pre-existing check, kept as a fallback). */
  fearGreedLabel?: string;
};

export function computeFlowCrossSignal(
  event: Pick<FlowEvent, 'type' | 'direction' | 'asset'>,
  ctx: FlowCrossSignalContext,
): FlowEvent['crossSignal'] {
  // Rule 1 — Whale Transfer (bullish outflow) + Spot Pulse REAL BUYING/ACCUMULATION.
  if (event.type === 'whale_transfer' && event.direction === 'Outflow') {
    const spotVerdict = ctx.spotPulseVerdictByAsset?.[event.asset];
    if (spotVerdict && BULLISH_SPOT_PULSE.has(spotVerdict)) {
      return { label: 'Spot Pulse confirming', color: 'green' };
    }
  }

  // Rule 2 — Liquidation Spike (bearish) + Console regime Bearish.
  if (event.type === 'liq_spike' && event.direction === 'Sell Pressure') {
    if (ctx.consoleRegimeByAsset?.[event.asset] === 'Bearish') {
      return { label: 'Regime confirming', color: 'red' };
    }
  }

  // Rule 3 — Smart Money (bullish) + Watchlist Whale Accumulation tag.
  if (event.type === 'smart_money' && event.direction === 'Smart Money') {
    const tags = ctx.watchlistTagsByAsset?.[event.asset];
    if (tags?.includes('Whale Accumulation')) {
      return { label: 'Watchlist confirming', color: 'green' };
    }
  }

  // Fallback — pre-existing Whale Transfer outflow + Fear & Greed reading Fear.
  if (event.type === 'whale_transfer' && event.direction === 'Outflow' && ctx.fearGreedLabel && FEAR_LABELS.has(ctx.fearGreedLabel)) {
    return { label: 'Regime shift confirming', color: 'green' };
  }

  return undefined;
}
