/**
 * ETF Flow rule engine.
 *
 * Sources: doc lines 801–856 (detailed), 299–313 (summary).
 *
 * Single-day flow bands (USD, positive = inflow):
 *   > +$500M    → "Heavy Institutional Buying"   (green)
 *   +$100M–$500M → "Solid ETF Inflow"            (green)
 *   +$10M–$100M  → "Mild Inflow"                 (grey-green)
 *   −$10M–+$10M  → "Neutral Flow"                (grey)
 *   −$10M–−$100M → "Mild Outflow"                (grey-red)
 *   −$100M–−$500M → "ETF Redemptions"            (red)
 *   < −$500M    → "Heavy Institutional Exit"      (red)
 *
 * Boundary decisions (inclusive-outer-band convention):
 *   - $500M exactly → "Heavy Institutional Buying" (outer band gets endpoint; ≥$500M).
 *   - $100M exactly → "Solid ETF Inflow" (outer band; range is $100M–<$500M inclusive lower).
 *   - $10M exactly  → "Mild Inflow"      (outer band; range is $10M–<$100M inclusive lower).
 *   - −$10M exactly → "Mild Outflow"     (outer band; Neutral is strictly between −$10M and +$10M).
 *   - −$100M exactly → "ETF Redemptions" (outer band; Mild Outflow range is −$10M exclusive to −$100M exclusive).
 *   - −$500M exactly → "Heavy Institutional Exit" (outer band; ≤−$500M).
 *   - Neutral band: strictly −$10M < flow < +$10M (both ±$10M belong to adjacent outer bands).
 *
 * 7D cumulative bands:
 *   > +$1B      → "Sustained Institutional Accumulation"
 *   +$100M–$1B  → "Net Positive Flow Week"
 *   near zero   → "Indecisive — Wait and Watch"
 *   negative    → "Week of Net Redemptions"
 *   < −$1B      → "Sustained Institutional Distribution"
 *
 *   Boundary decisions (7D):
 *   - Doc says ">+$1B" for the top band, so $1B exactly → "Net Positive Flow Week".
 *   - "Near zero" is not given a hard threshold in the doc; using ±$100M for the
 *     near-zero band (consistent with the single-day $100M breakpoint).  Anything
 *     between −$100M and +$100M (inclusive) is treated as "Indecisive".
 *   - Between $100M and $1B (inclusive lower, exclusive upper) → "Net Positive Flow Week".
 *   - Any negative (< −$100M but > −$1B) → "Week of Net Redemptions".
 *   - At or below −$1B → "Sustained Institutional Distribution".
 *
 * Cross-signal checks (doc lines 824–844):
 *   Heavy ETF inflow + coinbasePremiumRising → "Dual Institutional Signal"       (green)
 *   Heavy ETF outflow + exchangeInflow       → "Institutional Exit Confirmed"    (red)
 *   ETF Inflow (any) + priceFlat/down        → "Accumulating Into Weakness"      (green)
 *   ETF Outflow (any) + priceRising          → "Selling Into Strength"           (amber)
 *
 *   "Heavy" conditions for cross-signals:
 *     Heavy inflow  = dailyFlowUsd > 500M
 *     Heavy outflow = dailyFlowUsd < −500M
 *   "ETF Inflow" = dailyFlowUsd > 0
 *   "ETF Outflow" = dailyFlowUsd < 0
 *   "Price flat/down" = priceChange7d ≤ 0
 *   "Price rising"    = priceChange7d > 0
 *   "Exchange inflow" = exchangeFlow === 'inflow'
 *
 * Priority when multiple cross-signals could fire:
 *   Dual Institutional Signal and Institutional Exit Confirmed are checked first
 *   (stronger, named signals).  Accumulating Into Weakness / Selling Into Strength
 *   are secondary — both can coexist with each other in theory but in practice the
 *   daily and price direction conditions are mutually exclusive.
 *
 * The 7D verdict is returned as a separate field (cumulative7d) — callers can use
 * it as the headline stat. The primary verdict comes from the daily reading.
 */

import type { Verdict } from '../contracts';

export type EtfInputs = {
  /** Daily net flow in USD (positive = inflow, negative = outflow). */
  dailyFlowUsd: number;
  /** 7D cumulative net flow in USD (positive = net inflow). */
  flow7dUsd: number;
  /**
   * 7D price change (fractional, e.g. 0.05 = +5%, −0.03 = −3%).
   * Used for cross-signal: "Accumulating Into Weakness" / "Selling Into Strength".
   */
  priceChange7d: number;
  /** Whether Coinbase premium is currently rising. */
  coinbasePremiumRising: boolean;
  /** Exchange flow direction for cross-signal check. */
  exchangeFlow: 'inflow' | 'outflow' | 'neutral';
};

export type EtfResult = {
  verdict: Verdict;
  /** 7D cumulative verdict — shown as headline stat. */
  cumulative7d: Verdict;
  tags: Verdict[];
};

const M10  =    10_000_000;
const M100 =   100_000_000;
const M500 =   500_000_000;
const B1   = 1_000_000_000;

function dailyVerdict(flow: number): Verdict {
  // Boundary convention: each shared endpoint belongs to the outer (higher-magnitude) band.
  // e.g. +$100M → Solid ETF Inflow (not Mild Inflow); −$500M → Heavy Exit (not Redemptions).
  if (flow >= M500)  return { label: 'Heavy Institutional Buying', color: 'green' };
  if (flow >= M100)  return { label: 'Solid ETF Inflow',           color: 'green' };
  if (flow >= M10)   return { label: 'Mild Inflow',                color: 'grey-green' };
  if (flow > -M10)   return { label: 'Neutral Flow',               color: 'grey' };
  if (flow > -M100)  return { label: 'Mild Outflow',               color: 'grey-red' };
  if (flow > -M500)  return { label: 'ETF Redemptions',            color: 'red' };
  return                     { label: 'Heavy Institutional Exit',  color: 'red' };
}

function weekly7dVerdict(flow7d: number): Verdict {
  if (flow7d > B1)     return { label: 'Sustained Institutional Accumulation', color: 'green' };
  if (flow7d >= M100)  return { label: 'Net Positive Flow Week',               color: 'grey-green' };
  if (flow7d >= -M100) return { label: 'Indecisive — Wait and Watch',          color: 'grey' };
  if (flow7d > -B1)    return { label: 'Week of Net Redemptions',              color: 'grey-red' };
  return                      { label: 'Sustained Institutional Distribution', color: 'red' };
}

export function computeEtf(inputs: EtfInputs): EtfResult {
  const { dailyFlowUsd, flow7dUsd, priceChange7d, coinbasePremiumRising, exchangeFlow } = inputs;

  const verdict     = dailyVerdict(dailyFlowUsd);
  const cumulative7d = weekly7dVerdict(flow7dUsd);
  const tags: Verdict[] = [];

  const isHeavyInflow  = dailyFlowUsd >= M500;  // ≥$500M → Heavy (boundary is outer band)
  const isHeavyOutflow = dailyFlowUsd <= -M500; // ≤−$500M → Heavy
  const isAnyInflow    = dailyFlowUsd > 0;
  const isAnyOutflow   = dailyFlowUsd < 0;
  const priceRising    = priceChange7d > 0;

  // --- Priority cross-signals (named compound signals) ---
  if (isHeavyInflow && coinbasePremiumRising) {
    tags.push({ label: 'Dual Institutional Signal', color: 'green' });
  }
  if (isHeavyOutflow && exchangeFlow === 'inflow') {
    tags.push({ label: 'Institutional Exit Confirmed', color: 'red' });
  }

  // --- Secondary cross-signals ---
  if (isAnyInflow && !priceRising) {
    tags.push({ label: 'Accumulating Into Weakness', color: 'green' });
  }
  if (isAnyOutflow && priceRising) {
    tags.push({ label: 'Selling Into Strength', color: 'amber' });
  }

  return { verdict, cumulative7d, tags };
}
