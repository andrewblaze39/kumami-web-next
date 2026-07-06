/**
 * Exchange Netflow rule engine.
 *
 * Sources: doc lines 526–554 (detailed), 216–229 (summary).
 *
 * net = outflow - inflow (positive = net outflow = accumulation; negative = net inflow = distribution)
 *
 * Full 7-band table (detailed doc wins over simplified summary):
 *   net ≥ +$1B           → "Strong Accumulation"   (green)
 *   +$200M ≤ net < +$1B  → "Accumulation"          (green)
 *   +$50M < net < +$200M → "Mild Accumulation"     (grey-green)
 *   -$50M ≤ net ≤ +$50M  → "Neutral"               (grey)
 *   -$200M < net < -$50M → "Mild Distribution"     (grey-red)
 *   -$1B < net ≤ -$200M  → "Distribution"          (red)
 *   net ≤ -$1B           → "Heavy Distribution"    (red)
 *
 * Boundary decisions:
 *   - ±$50M inclusive → Neutral (the "near zero ±$50M" zone from doc).
 *   - $200M outflow exactly → Accumulation (lower bound of that band).
 *   - $1B outflow exactly → Strong Accumulation (≥ $1B).
 *   - Mirror on inflow side: -$200M exactly → Distribution; -$1B exactly → Heavy Distribution.
 *
 * Divergence tags (doc lines 540–554):
 *   Requires flowAccelerating=true and a clear price direction (priceChange ≠ 0).
 *   Price direction × flow direction:
 *     price↑ + inflow growing  → "· Distribution into Strength"   (red)
 *     price↓ + outflow growing → "· Accumulation on Dip"          (green)
 *     price↑ + outflow growing → "· Conviction Rally"             (green)
 *     price↓ + inflow growing  → "· Panic Selling"                (red)
 */

import type { Verdict } from '../contracts';

export type NetflowInputs = {
  /**
   * Net USD flow: outflow − inflow over selected timeframe.
   * Positive = net outflow (coins leaving exchanges = accumulation signal).
   * Negative = net inflow (coins arriving to exchanges = distribution signal).
   */
  netUsd: number;
  /**
   * Price change over the same period (fractional, e.g. 0.05 = +5%).
   * Used for divergence detection. 0 = no clear directional price move.
   */
  priceChange: number;
  /**
   * Whether the flow is accelerating/growing in its current direction.
   * True triggers divergence tag computation.
   */
  flowAccelerating: boolean;
};

export type NetflowResult = {
  verdict: Verdict;
  tags: Verdict[];
};

const B = 1_000_000_000;
const M200 = 200_000_000;
const M50  = 50_000_000;

function baseVerdict(net: number): Verdict {
  if (net >= B)    return { label: 'Strong Accumulation', color: 'green' };
  if (net >= M200) return { label: 'Accumulation',        color: 'green' };
  if (net > M50)   return { label: 'Mild Accumulation',   color: 'grey-green' };
  if (net >= -M50) return { label: 'Neutral',             color: 'grey' };
  if (net > -M200) return { label: 'Mild Distribution',   color: 'grey-red' };
  if (net > -B)    return { label: 'Distribution',        color: 'red' };
  return               { label: 'Heavy Distribution',  color: 'red' };
}

function divergenceTag(
  netUsd: number,
  priceChange: number,
  flowAccelerating: boolean,
): Verdict | null {
  if (!flowAccelerating || priceChange === 0) return null;

  const priceUp   = priceChange > 0;
  const isOutflow = netUsd > 0; // net outflow = accumulation direction

  if (priceUp && !isOutflow)  return { label: '· Distribution into Strength', color: 'red' };
  if (!priceUp && isOutflow)  return { label: '· Accumulation on Dip',        color: 'green' };
  if (priceUp && isOutflow)   return { label: '· Conviction Rally',           color: 'green' };
  if (!priceUp && !isOutflow) return { label: '· Panic Selling',              color: 'red' };
  return null;
}

export function computeNetflow(inputs: NetflowInputs): NetflowResult {
  const { netUsd, priceChange, flowAccelerating } = inputs;
  const verdict = baseVerdict(netUsd);
  const tag = divergenceTag(netUsd, priceChange, flowAccelerating);
  return { verdict, tags: tag ? [tag] : [] };
}
