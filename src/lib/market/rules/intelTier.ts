/**
 * Intelligence / Intel Tier assignment engine.
 *
 * Sources: doc lines 1014–1041.
 *
 * Each incoming item is scored on two axes then combined into A/B/C.
 *
 * Axis 1 — Price impact potential (doc lines 1022–1031):
 *   HIGH impact:
 *     Regulatory action, exchange hack, ETF approval/rejection,
 *     macro print (CPI, Fed rate)
 *   MEDIUM impact:
 *     Protocol upgrade, major partnership, listing/delisting,
 *     token unlock > 5% of supply
 *   LOW impact:
 *     Community news, minor partnership, project update
 *
 * Axis 2 — Time sensitivity (doc lines 1032–1035):
 *   'now'        — happening now / last 6H  → boost tier up
 *   'scheduled'  — scheduled future event    → keep tier
 *   'evergreen'  — historical/evergreen context → lower tier
 *
 * Combined matrix (doc lines 1037–1041):
 *   High impact + now         → A  (red badge)
 *   High impact + scheduled   → B  (amber badge)
 *   Medium impact + now       → B  (amber badge)
 *   Low impact OR evergreen   → C  (grey badge)
 *
 * Boundary decisions:
 *   - The doc says "Low impact or evergreen" → C.  This means:
 *       a) ANY low-impact item → C regardless of timing.
 *       b) ANY evergreen item → C regardless of impact.
 *   - "High impact + evergreen" is not listed; applying rule (b): C.
 *   - "Medium impact + scheduled" is not listed; applying conservative
 *     rule (keep tier = B from "High + scheduled", but Medium doesn't
 *     qualify for A, so B is the ceiling; Medium + scheduled stays B
 *     for the same "scheduled → keep tier" reason).
 *     Decision: Medium + scheduled → B. Documented here as an edge case.
 *   - "Medium impact + evergreen" → C (evergreen always C per rule (b)).
 *
 * Full matrix including unlisted combinations:
 *   High   + now       → A
 *   High   + scheduled → B
 *   High   + evergreen → C  (evergreen always downgrades)
 *   Medium + now       → B
 *   Medium + scheduled → B  (keep tier at B ceiling for medium)
 *   Medium + evergreen → C
 *   Low    + now       → C  (low impact can't reach A or B)
 *   Low    + scheduled → C
 *   Low    + evergreen → C
 *
 * Badge colors (doc lines 1038–1041):
 *   A → red
 *   B → amber
 *   C → grey
 *
 * The output is intentionally simple — just a tier letter and a Verdict.
 * The LLM interpretation is generated elsewhere (only for A-tier items).
 */

import type { Verdict } from '../contracts';

export type IntelImpact = 'high' | 'medium' | 'low';
export type IntelTiming = 'now' | 'scheduled' | 'evergreen';
export type IntelTierLabel = 'A' | 'B' | 'C';

export type IntelTierInputs = {
  /** Price impact potential of the item. */
  impact: IntelImpact;
  /**
   * Time sensitivity of the item:
   *   'now'       = happening now / last 6H
   *   'scheduled' = scheduled future event
   *   'evergreen' = historical/evergreen context
   */
  timing: IntelTiming;
};

export type IntelTierResult = {
  tier: IntelTierLabel;
  verdict: Verdict;
  tags: Verdict[];
};

const TIER_VERDICTS: Record<IntelTierLabel, Verdict> = {
  A: { label: 'A', color: 'red' },
  B: { label: 'B', color: 'amber' },
  C: { label: 'C', color: 'grey' },
};

function assignTier(impact: IntelImpact, timing: IntelTiming): IntelTierLabel {
  // Evergreen always → C (doc: "historical/evergreen context → lower tier")
  if (timing === 'evergreen') return 'C';

  // Low impact always → C (doc: "low impact or evergreen → C")
  if (impact === 'low') return 'C';

  // High impact + now → A
  if (impact === 'high' && timing === 'now') return 'A';

  // High impact + scheduled → B
  if (impact === 'high' && timing === 'scheduled') return 'B';

  // Medium impact + now → B
  if (impact === 'medium' && timing === 'now') return 'B';

  // Medium impact + scheduled → B (documented decision: medium ceiling is B)
  if (impact === 'medium' && timing === 'scheduled') return 'B';

  // Fallback (should not be reached with valid inputs)
  return 'C';
}

export function computeIntelTier(inputs: IntelTierInputs): IntelTierResult {
  const tier = assignTier(inputs.impact, inputs.timing);
  return {
    tier,
    verdict: TIER_VERDICTS[tier],
    tags: [],
  };
}
