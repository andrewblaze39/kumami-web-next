/**
 * Stablecoin Supply rule engine.
 *
 * Sources: doc lines 871–881 (detailed matrix), 327–335 (summary).
 *
 * 30D supply change bands (fractional, e.g. 0.05 = +5%):
 *
 *   > +5%     → "Dry Powder Building"   (green)
 *   +1% to +5% → "Mild Capital Inflow"  (grey-green)
 *   ±1%       → "Neutral"               (grey)
 *   −1% to −5% → "Capital Deploying"   (grey)
 *   < −5%     → "Stablecoin Drain"      (amber)
 *
 * Boundary decisions:
 *   - Doc writes ">+5%" for Dry Powder Building, so +5% exactly is "Mild Capital Inflow".
 *   - Doc writes "+1–5%" for Mild Capital Inflow — lower bound +1% inclusive.
 *   - Doc writes "flat" / "±1%" for Neutral — ±1% both endpoints inclusive.
 *   - Doc writes "−1 to −5%" for Capital Deploying — upper bound −1% inclusive (i.e. the
 *     same −1% that is the lower boundary of Neutral; the symmetric convention applied
 *     here: −1% belongs to Capital Deploying, mirroring +1% belonging to Mild Capital
 *     Inflow not Neutral).
 *
 *   Wait — doc line 878 says "30D change -1–5% → Capital Deploying" after "flat ±1% →
 *   Neutral".  The symmetry convention used elsewhere (outer band gets boundary) would
 *   put −1% in Capital Deploying and +1% in Mild Capital Inflow, leaving the true
 *   "near-zero" Neutral band strictly between −1% and +1% exclusive.
 *
 *   Final boundary table (strict vs inclusive):
 *     change > +0.05              → Dry Powder Building
 *     +0.01 ≤ change ≤ +0.05     → Mild Capital Inflow
 *     −0.01 < change < +0.01      → Neutral  [strictly between ±1%]
 *     −0.05 ≤ change ≤ −0.01     → Capital Deploying
 *     change < −0.05              → Stablecoin Drain
 *
 *   This makes ±1% belong to the adjacent outer band (consistent with the Mild
 *   Capital Inflow / Capital Deploying labels, not Neutral).
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

  if (change30d > PCT5) {
    verdict = { label: 'Dry Powder Building',  color: 'green' };
  } else if (change30d >= PCT1) {
    verdict = { label: 'Mild Capital Inflow',  color: 'grey-green' };
  } else if (change30d > -PCT1) {
    verdict = { label: 'Neutral',              color: 'grey' };
  } else if (change30d > -PCT5) {
    verdict = { label: 'Capital Deploying',    color: 'grey' };
  } else {
    // change30d <= -PCT5  (−5% belongs to Stablecoin Drain — outer band)
    verdict = { label: 'Stablecoin Drain',     color: 'amber' };
  }

  return { verdict, tags: [] };
}
