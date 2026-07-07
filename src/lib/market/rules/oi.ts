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
 *   - OI flat is not a listed case in the doc. Decision: when OI is flat
 *     and price is moving, the signal is weaker; map OI-flat to the most
 *     neutral available outcome.  However the doc matrix only covers OI↑
 *     and OI↓ — if inputs have oiDirection='flat', fall through to a
 *     seventh unlisted "Stable OI" (grey) state, documented here:
 *       OI flat + any price direction → "Stable OI"  (grey)
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
    // oiDirection === 'flat' — not in the 6-cell doc matrix; unlisted fallback
    verdict = { label: 'Stable OI', color: 'grey' };
  }

  return { verdict, tags: [] };
}
