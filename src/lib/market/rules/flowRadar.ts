/**
 * Flow Radar event severity classifier.
 *
 * Sources: doc lines 133–154 (Console section), 1094–1145 (detailed per-event).
 *
 * This engine classifies raw event facts into FlowEvent-compatible
 * severity + direction + description.  It is pure: no Date.now() —
 * callers pass timestamps as strings and the engine does not inspect
 * them for recency (that is the radarWatchlist engine's job).
 *
 * Per-event thresholds (doc lines 1104–1134):
 *
 * whale_transfer:
 *   amountUsd > $100M  → HIGH (red)
 *   $10M–$100M         → MED  (amber)
 *   < $10M             → LOW  (grey) — filtered out by default in UI
 *
 *   Boundary: $100M exactly → HIGH (outer band); $10M exactly → MED.
 *
 * exchange_flow:
 *   amountUsd > $500M  → HIGH
 *   $100M–$500M        → MED
 *   < $100M            → LOW
 *
 *   Boundary: $500M exactly → HIGH; $100M exactly → MED.
 *
 * liq_spike (per hour):
 *   amountUsd > $200M  → HIGH
 *   $50M–$200M         → MED
 *   < $50M             → LOW
 *
 *   Boundary: $200M exactly → HIGH; $50M exactly → MED.
 *
 * netflow_flip: always MED (doc lines 144–145, 1121–1123).
 *
 * whale_wall:
 *   amountUsd > $50M AND within 5% of current price → MED
 *   Otherwise: LOW
 *   (doc line 146: ">$50M within 5% of price = MED")
 *   No HIGH severity for whale_wall in the doc.
 *
 * smart_money:
 *   Doc says "smart_money per doc" in the brief.  The detailed section
 *   (lines 1094–1145) does not give explicit thresholds for smart_money
 *   event type — the doc lists it as a FlowEvent type and implies HIGH
 *   significance (it appears on the pro-tier alert feed as a distinct
 *   signal).  Decision: treat smart_money events as MED by default,
 *   with a dedicated 'confidence' input that can bump to HIGH if provided
 *   and > 0.8.  This is documented as an intentional decision since the
 *   doc lacks explicit thresholds.
 *
 * Direction tags (doc lines 1128–1134):
 *   Transfer TO exchange     → "Inflow"          (bear lean)
 *   Transfer FROM exchange   → "Outflow"         (bull lean)
 *   Net flow positive        → "Buy Pressure"
 *   Net flow negative        → "Sell Pressure"
 *   Whale limit order above price → "Resistance Wall"
 *   Whale limit order below price → "Support Wall"
 *
 * The doc also lists (lines 148–152) from the Console brief:
 *   accumulation pattern → "Accumulation" (bull)
 *   smart money long     → "Smart Money"  (bull)
 * These are used for smart_money event type.
 *
 * Additional directions from FlowEvent contract (contracts.ts):
 *   "Accumulation", "Smart Money" — used for smart_money events.
 */

import type { FlowEvent } from '../contracts';

/** Subset of FlowEvent fields produced by this engine. */
export type FlowRadarResult = {
  severity: FlowEvent['severity'];
  direction: FlowEvent['direction'];
  description: string;
};

export type FlowRadarInputs = {
  type: FlowEvent['type'];
  asset: string;
  amountUsd: number;

  /**
   * For whale_transfer and exchange_flow: whether the movement
   * is toward an exchange (inflow) or away (outflow).
   */
  toExchange?: boolean;

  /**
   * For whale_wall: whether the order is above current price
   * (resistance) or below (support).
   * For whale_wall, also used with pricePct to determine MED threshold.
   */
  abovePrice?: boolean;

  /**
   * For whale_wall: distance from current price as a fraction
   * (e.g. 0.03 = 3%).  Used to determine if within 5% threshold.
   */
  distanceFromPrice?: number;

  /**
   * For netflow_flip: direction of the new net flow after the flip.
   * true = flipped to positive (buy pressure), false = flipped to negative.
   */
  flippedPositive?: boolean;

  /**
   * For smart_money: direction of the position (long = true).
   */
  isLong?: boolean;

  /**
   * For smart_money: confidence 0–1.  > 0.8 bumps severity to HIGH.
   * (Doc does not give explicit thresholds; this is a documented decision.)
   */
  confidence?: number;
};

const M10  =    10_000_000;
const M50  =    50_000_000;
const M100 =   100_000_000;
const M200 =   200_000_000;
const M500 =   500_000_000;

export function computeFlowRadar(inputs: FlowRadarInputs): FlowRadarResult {
  const { type, asset, amountUsd, toExchange, abovePrice, distanceFromPrice,
    flippedPositive, isLong, confidence } = inputs;

  switch (type) {
    case 'whale_transfer': {
      const severity: FlowEvent['severity'] =
        amountUsd >= M100 ? 'HIGH' :
        amountUsd >= M10  ? 'MED'  : 'LOW';

      const direction: FlowEvent['direction'] = toExchange ? 'Inflow' : 'Outflow';
      const label = toExchange ? 'to exchange' : 'from exchange';
      const description = `${asset} whale transfer ${label}: $${(amountUsd / 1e6).toFixed(0)}M`;
      return { severity, direction, description };
    }

    case 'exchange_flow': {
      const severity: FlowEvent['severity'] =
        amountUsd >= M500 ? 'HIGH' :
        amountUsd >= M100 ? 'MED'  : 'LOW';

      const direction: FlowEvent['direction'] = toExchange ? 'Inflow' : 'Outflow';
      const label = toExchange ? 'inflow' : 'outflow';
      const description = `${asset} exchange ${label}: $${(amountUsd / 1e6).toFixed(0)}M`;
      return { severity, direction, description };
    }

    case 'liq_spike': {
      const severity: FlowEvent['severity'] =
        amountUsd >= M200 ? 'HIGH' :
        amountUsd >= M50  ? 'MED'  : 'LOW';

      // Liquidation spike direction is Sell Pressure (longs wiped) or Buy Pressure (shorts)
      // Doc doesn't distinguish here — use Sell Pressure as default for liq spikes
      const direction: FlowEvent['direction'] = 'Sell Pressure';
      const description = `${asset} liquidation spike: $${(amountUsd / 1e6).toFixed(0)}M/h`;
      return { severity, direction, description };
    }

    case 'netflow_flip': {
      // Always MED (doc lines 144–145, 1121–1123)
      const direction: FlowEvent['direction'] = flippedPositive ? 'Buy Pressure' : 'Sell Pressure';
      const label = flippedPositive ? 'sell→buy flip' : 'buy→sell flip';
      const description = `${asset} netflow flip: ${label}`;
      return { severity: 'MED', direction, description };
    }

    case 'whale_wall': {
      // MED only if > $50M AND within 5% of price; otherwise LOW
      const withinRange = (distanceFromPrice ?? Infinity) <= 0.05;
      const severity: FlowEvent['severity'] = (amountUsd > M50 && withinRange) ? 'MED' : 'LOW';
      const direction: FlowEvent['direction'] = abovePrice ? 'Resistance Wall' : 'Support Wall';
      const label = abovePrice ? 'resistance wall' : 'support wall';
      const description = `${asset} whale ${label}: $${(amountUsd / 1e6).toFixed(0)}M`;
      return { severity, direction, description };
    }

    case 'smart_money': {
      // Doc lacks explicit thresholds; confidence > 0.8 → HIGH, else MED (documented decision)
      const severity: FlowEvent['severity'] = (confidence ?? 0) > 0.8 ? 'HIGH' : 'MED';
      const direction: FlowEvent['direction'] = isLong ? 'Smart Money' : 'Accumulation';
      const label = isLong ? 'smart money long' : 'smart money accumulation';
      const description = `${asset} ${label}: $${(amountUsd / 1e6).toFixed(0)}M`;
      return { severity, direction, description };
    }
  }
}
