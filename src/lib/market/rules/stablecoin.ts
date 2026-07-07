/**
 * Stablecoin Supply rule engine.
 *
 * Sources: doc lines 871–881 (detailed matrix), 327–335 (summary).
 *
 * 30D supply change bands (fractional, e.g. 0.05 = +5%):
 *
 *   ≥ +5%     → "Dry Powder Building"   (green)    [+5% inclusive outer band]
 *   +1% to <+5% → "Mild Capital Inflow"  (grey-green)
 *   ±1%       → "Neutral"               (grey)     [strictly −1% < x < +1%]
 *   −1% to >−5% → "Capital Deploying"  (grey)
 *   ≤ −5%     → "Stablecoin Drain"      (amber)    [−5% inclusive outer band]
 *
 * Boundary decisions (inclusive-outer-band convention, symmetric with etf.ts):
 *   - +5% exactly → "Dry Powder Building" (outer band gets endpoint; ≥+5%).
 *   - +1% exactly → "Mild Capital Inflow" (outer band; strictly < +5%).
 *   - Neutral: strictly between −1% and +1% (both endpoints excluded).
 *   - −1% exactly → "Capital Deploying" (outer band; mirrors +1% → Mild Capital Inflow).
 *   - −5% exactly → "Stablecoin Drain" (outer band; ≤−5%).
 *
 *   Doc line 878 says "30D change −1–5% → Capital Deploying" after "flat ±1% → Neutral".
 *   Applying the consistent inclusive-outer-band convention: outer bands (Dry Powder /
 *   Stablecoin Drain) own their ±5% boundaries, making the scale fully symmetric.
 *
 *   Final boundary table (inclusive-outer-band convention, consistent with etf.ts):
 *     change ≥ +0.05              → Dry Powder Building   (+5% belongs to outer band)
 *     +0.01 ≤ change < +0.05      → Mild Capital Inflow
 *     −0.01 < change < +0.01      → Neutral  [strictly between ±1%]
 *     −0.05 < change ≤ −0.01      → Capital Deploying
 *     change ≤ −0.05              → Stablecoin Drain      (−5% belongs to outer band)
 *
 *   This makes ±5% belong to the outer bands (Dry Powder Building / Stablecoin Drain)
 *   and ±1% belong to the adjacent inner bands (Mild Capital Inflow / Capital Deploying),
 *   symmetric and consistent with the inclusive-outer-band convention.
 *
 * Note on "Capital Deploying" color:
 *   Doc says "grey — could be bullish if being used to buy, or bearish if leaving
 *   crypto."  Color is explicitly grey (not grey-green or grey-red).
 *
 * No modifier tags defined in the doc for this panel — it is intentionally simple
 * (a slow-moving macro indicator, not a trade trigger).
 */

import type { Verdict } from '../contracts';

export type StablecoinInputs = {
  /**
   * 30D change in stablecoin market cap as a fraction.
   * e.g. 0.05 = +5%, −0.03 = −3%.
   */
  change30d: number;
};

export type StablecoinResult = {
  verdict: Verdict;
  tags: Verdict[];
};

const PCT5 =  0.05;
const PCT1 =  0.01;

export function computeStablecoin(inputs: StablecoinInputs): StablecoinResult {
  const { change30d } = inputs;

  let verdict: Verdict;

  if (change30d >= PCT5) {
    verdict = { label: 'Dry Powder Building',  color: 'green' };
  } else if (change30d >= PCT1) {
    verdict = { label: 'Mild Capital Inflow',  color: 'grey-green' };
  } else if (change30d > -PCT1) {
    verdict = { label: 'Neutral',              color: 'grey' };
  } else if (change30d > -PCT5) {
    verdict = { label: 'Capital Deploying',    color: 'grey' };
  } else {
    // change30d <= -PCT5  (≤−5% belongs to Stablecoin Drain — outer band, symmetric with ≥+5%)
    verdict = { label: 'Stablecoin Drain',     color: 'amber' };
  }

  return { verdict, tags: [] };
}
