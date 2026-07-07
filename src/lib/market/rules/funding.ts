/**
 * Funding Rate rule engine.
 *
 * Sources: doc lines 416–449 (detailed), 186–196 (summary).
 *
 * Bands on 3-cycle average (all values as decimals, e.g. 0.15 = 0.15%):
 *   > +0.15%             → "Overheated Long"   (red)
 *   +0.06% to +0.15%     → "Crowded Long"      (amber)
 *   0% to +0.05%         → "Neutral"           (grey)  [+0.01 to +0.05 per detailed doc]
 *   -0.05% to -0.01%     → "Mild Short Bias"   (grey)  [named in detailed doc lines 428–431]
 *   -0.1% to -0.06%      → "Crowded Short"     (amber)
 *   < -0.1%              → "Extreme Short"     (green)
 *
 * Boundary decisions:
 *   - Exactly +0.15% is "Crowded Long" (top of amber band; > 0.15 triggers Overheated).
 *   - Exactly -0.1% is "Crowded Short" (bottom of amber band; < -0.1 triggers Extreme Short).
 *   - 0% is treated as "Neutral" (matches the spirit of "±0.05% neutral zone").
 *   - Gap [+0.051, +0.059] treated as Neutral (≤ 0.05 upper bound for Neutral).
 *     Gap [-0.051, -0.059] treated as Mild Short Bias (≥ -0.05 lower bound for that band).
 *
 * Modifiers:
 *   - "Persistently" prefix: extreme band (Overheated Long or Extreme Short) held 3+
 *     consecutive cycles in cycleHistory (most recent 3 items in the array).
 *   - "· Rising Fast" tag: delta24h > +0.05%.
 */

import type { Verdict } from '../contracts';

export type FundingInputs = {
  /** 3-cycle OI-weighted average funding rate (decimal) */
  avg3Cycle: number;
  /**
   * Array of recent per-cycle rates (most recent last).
   * Used to detect persistent extremes (3+ consecutive cycles in extreme band).
   */
  cycleHistory: number[];
  /** 24-hour change in funding rate (decimal) */
  delta24h: number;
};

export type FundingResult = {
  verdict: Verdict;
  tags: Verdict[];
};

type Band = { label: string; color: Verdict['color']; isExtreme: boolean };

function baseBand(avg: number): Band {
  if (avg > 0.15)  return { label: 'Overheated Long', color: 'red',   isExtreme: true };
  if (avg >= 0.06) return { label: 'Crowded Long',    color: 'amber', isExtreme: false };
  if (avg >= 0)    return { label: 'Neutral',         color: 'grey',  isExtreme: false };
  if (avg >= -0.05) return { label: 'Mild Short Bias', color: 'grey', isExtreme: false };
  if (avg >= -0.1) return { label: 'Crowded Short',   color: 'amber', isExtreme: false };
  return              { label: 'Extreme Short',   color: 'green', isExtreme: true };
}

function isExtreme(rate: number): boolean {
  return rate > 0.15 || rate < -0.1;
}

function isPersistent(avg: number, history: number[]): boolean {
  if (!isExtreme(avg)) return false;
  const recent = history.slice(-3);
  if (recent.length < 3) return false;
  return recent.every(r => isExtreme(r) && Math.sign(r) === Math.sign(avg));
}

export function computeFunding(inputs: FundingInputs): FundingResult {
  const { avg3Cycle, cycleHistory, delta24h } = inputs;
  const band = baseBand(avg3Cycle);
  const persistent = isPersistent(avg3Cycle, cycleHistory);

  const verdict: Verdict = {
    label: persistent ? `Persistently ${band.label}` : band.label,
    color: band.color,
  };

  const tags: Verdict[] = [];
  if (delta24h > 0.05) {
    tags.push({ label: '· Rising Fast', color: 'amber' });
  } else if (band.isExtreme && delta24h !== 0 && Math.sign(delta24h) !== Math.sign(avg3Cycle)) {
    // Funding moving back toward zero from an extreme band → Unwinding signal.
    // "Rising Fast" (delta > +0.05) supersedes Unwinding when it fires — they are
    // mutually exclusive: for Overheated Long, Unwinding needs delta < 0 so no overlap;
    // for Extreme Short, Unwinding needs delta > 0 but Rising Fast needs delta > 0.05,
    // so the else-if ensures Rising Fast wins when delta > 0.05.
    tags.push({ label: '· Unwinding', color: 'amber' });
  }

  return { verdict, tags };
}
