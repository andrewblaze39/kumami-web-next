/**
 * Open Interest (OI) Trend rule engine.
 *
 * Sources: doc lines 859–868 (6-cell matrix), 316–326 (summary).
 *
 * 6-cell OI-direction × price-direction matrix (doc lines 862–868):
 *
 *   OI↑ + Price↑ → "Trend Strengthening"    (green)
 *   OI↑ + Price flat → "Leverage Building"  (amber)
 *   OI↑ + Price↓ → "Overleveraged Market"   (red)
 *   OI↓ + Price↑ → "Short Covering Rally"   (amber)
 *   OI↓ + Price↓ → "Capitulation/Unwind"    (grey)
 *   OI↓ + Price flat → "Deleveraging"        (grey)
 *
 * "Flat" is defined as |priceChange| ≤ flatThreshold and
 * |oiChange| ≤ oiFlat threshold.  Callers pass pre-classified
 * trend directions to keep this engine pure; alternatively they
 * can pass fractional changes and a threshold (default ±1% / ±0.5%).
 *
 * Boundary decisions:
 *   - The doc has exactly 6 cells: 2 OI directions × 3 price directions.
 *     There is no ambiguity about which cell wins — they are mutually
 *     exclusive by construction.
 *   - OI flat (Rachelle v1.15 Plus §2.7):
 *       OI flat + Price↑   → "Trend Without Leverage" (grey-green)
 *       OI flat + Price↓   → "Decline Without Panic"  (grey)
 *       OI flat + Price flat → "Stable OI"            (grey)
 *
 * Input design: accept pre-classified directions (up/flat/down) rather
 * than raw numbers.  This keeps the engine pure and testable without
 * requiring threshold tuning inside the rule engine itself.
 */

import type { Verdict } from '../contracts';

export type OiDirection = 'up' | 'flat' | 'down';

export type OiInputs = {
  /** OI trend direction over the selected range. */
  oiDirection: OiDirection;
  /** Price trend direction over the same range. */
  priceDirection: OiDirection;
};

export type OiResult = {
  verdict: Verdict;
  tags: Verdict[];
};

export function computeOi(inputs: OiInputs): OiResult {
  const { oiDirection, priceDirection } = inputs;

  let verdict: Verdict;

  if (oiDirection === 'up') {
    if (priceDirection === 'up') {
      verdict = { label: 'Trend Strengthening', color: 'green' };
    } else if (priceDirection === 'flat') {
      verdict = { label: 'Leverage Building',   color: 'amber' };
    } else {
      // priceDirection === 'down'
      verdict = { label: 'Overleveraged Market', color: 'red' };
    }
  } else if (oiDirection === 'down') {
    if (priceDirection === 'up') {
      verdict = { label: 'Short Covering Rally',  color: 'amber' };
    } else if (priceDirection === 'flat') {
      verdict = { label: 'Deleveraging',          color: 'grey' };
    } else {
      // priceDirection === 'down'
      verdict = { label: 'Capitulation/Unwind',   color: 'grey' };
    }
  } else {
    // OI flat — Rachelle v1.15 Plus §2.7: a move without new leverage is its own state.
    if (priceDirection === 'up') {
      verdict = { label: 'Trend Without Leverage', color: 'grey-green' };
    } else if (priceDirection === 'down') {
      verdict = { label: 'Decline Without Panic',  color: 'grey' };
    } else {
      verdict = { label: 'Stable OI',              color: 'grey' };
    }
  }

  return { verdict, tags: [] };
}
