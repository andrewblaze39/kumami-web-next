import { describe, it, expect } from 'vitest';
import { computeFunding, type FundingInputs } from '../funding';

// Doc lines 416–449 (detailed) and lines 186–196 (summary).
// Bands (3-cycle average):
//   > +0.15%            → "Overheated Long"  (red)
//   +0.06% to +0.15%    → "Crowded Long"     (amber)
//   +0.01% to +0.05%    → "Neutral"          (grey)   ← "Neutral" upper half
//   -0.01% to -0.05%    → "Mild Short Bias"  (grey)   ← doc explicitly names this
//   -0.06% to -0.1%     → "Crowded Short"    (amber)
//   < -0.1%             → "Extreme Short"    (green)
//
// NOTE: Doc lines 186-191 use a simplified 5-band table (no "Mild Short Bias").
// The detailed section (lines 416-437) wins — it splits the neutral zone into two named bands.
// Boundary decisions (strict vs inclusive):
//   > +0.15% → Overheated, so 0.15% = "Crowded Long" (top of amber band)
//   +0.06% to +0.15% inclusive → Crowded Long
//   +0.01% to +0.05% inclusive → Neutral
//   -0.01% to -0.05% inclusive → Mild Short Bias (grey)
//   -0.06% to -0.1% inclusive → Crowded Short
//   < -0.1% → Extreme Short, so -0.1% = "Crowded Short" (bottom of amber)
//
// The ranges have an implicit gap: 0.05% < x < 0.06% and -0.05% < x < -0.06%.
// Decision: values in 0.051%–0.059% round to nearest named band by proximity.
// Actually doc text "±0.05%" in summary (line 189) suggests 0 to ±0.05% is Neutral.
// Reconcile: detailed doc wins: +0.01 to +0.05 = Neutral, +0.06 to +0.15 = Crowded Long.
// Gap [0.0501, 0.0599]: assign to Neutral (closer to +0.05 boundary described).
// Similarly [-0.0501, -0.0599]: assign to Mild Short Bias.
// Implementation uses: ≤ 0.05 for Neutral upper bound, ≥ 0.06 for Crowded Long lower bound.

describe('computeFunding — base verdict from 3-cycle average', () => {
  it('Overheated Long when avg > +0.15%', () => {
    const r = computeFunding({ avg3Cycle: 0.16, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Overheated Long');
    expect(r.verdict.color).toBe('red');
  });

  it('Overheated Long just above +0.15% boundary', () => {
    const r = computeFunding({ avg3Cycle: 0.151, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Overheated Long');
  });

  it('Crowded Long at exactly +0.15%', () => {
    const r = computeFunding({ avg3Cycle: 0.15, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Crowded Long');
    expect(r.verdict.color).toBe('amber');
  });

  it('Crowded Long at +0.06%', () => {
    const r = computeFunding({ avg3Cycle: 0.06, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Crowded Long');
  });

  it('Neutral at +0.05%', () => {
    const r = computeFunding({ avg3Cycle: 0.05, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Neutral');
    expect(r.verdict.color).toBe('grey');
  });

  it('Neutral at +0.01%', () => {
    const r = computeFunding({ avg3Cycle: 0.01, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Neutral');
  });

  it('Neutral at 0%', () => {
    const r = computeFunding({ avg3Cycle: 0, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Neutral');
  });

  it('Mild Short Bias at -0.01%', () => {
    const r = computeFunding({ avg3Cycle: -0.01, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Mild Short Bias');
    expect(r.verdict.color).toBe('grey');
  });

  it('Mild Short Bias at -0.05%', () => {
    const r = computeFunding({ avg3Cycle: -0.05, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Mild Short Bias');
  });

  it('Crowded Short at -0.06%', () => {
    const r = computeFunding({ avg3Cycle: -0.06, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Crowded Short');
    expect(r.verdict.color).toBe('amber');
  });

  it('Crowded Short at -0.1%', () => {
    const r = computeFunding({ avg3Cycle: -0.1, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Crowded Short');
  });

  it('Extreme Short just below -0.1%', () => {
    const r = computeFunding({ avg3Cycle: -0.101, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Extreme Short');
    expect(r.verdict.color).toBe('green');
  });

  it('Extreme Short at -0.2%', () => {
    const r = computeFunding({ avg3Cycle: -0.2, cycleHistory: [], delta24h: 0 });
    expect(r.verdict.label).toBe('Extreme Short');
  });
});

describe('computeFunding — Persistently prefix modifier', () => {
  // Doc lines 440–443: same extreme 3+ consecutive cycles → prepend "Persistently"
  // "Extreme" = Overheated Long or Extreme Short bands

  it('adds Persistently prefix when extreme held 3+ cycles', () => {
    const r = computeFunding({
      avg3Cycle: 0.2,
      cycleHistory: [0.18, 0.19, 0.21], // 3 consecutive above 0.15
      delta24h: 0,
    });
    expect(r.verdict.label).toBe('Persistently Overheated Long');
  });

  it('no Persistently prefix when only 2 consecutive extreme cycles', () => {
    const r = computeFunding({
      avg3Cycle: 0.2,
      cycleHistory: [0.14, 0.18, 0.21], // only 2 consecutive above 0.15
      delta24h: 0,
    });
    expect(r.verdict.label).toBe('Overheated Long');
  });

  it('adds Persistently to Extreme Short when held 3+ cycles', () => {
    const r = computeFunding({
      avg3Cycle: -0.15,
      cycleHistory: [-0.12, -0.13, -0.14],
      delta24h: 0,
    });
    expect(r.verdict.label).toBe('Persistently Extreme Short');
  });

  it('no Persistently for non-extreme bands even if sustained', () => {
    // Crowded Long sustained — doc only says extreme readings get Persistently
    const r = computeFunding({
      avg3Cycle: 0.1,
      cycleHistory: [0.09, 0.1, 0.11],
      delta24h: 0,
    });
    expect(r.verdict.label).toBe('Crowded Long');
    expect(r.verdict.label).not.toContain('Persistently');
  });
});

describe('computeFunding — Rising Fast tag', () => {
  // Doc lines 444–445: 24h delta > +0.05% → append "· Rising Fast"

  it('adds Rising Fast tag when delta24h > +0.05%', () => {
    const r = computeFunding({ avg3Cycle: 0.08, cycleHistory: [], delta24h: 0.06 });
    expect(r.tags.some(t => t.label === '· Rising Fast')).toBe(true);
  });

  it('no Rising Fast tag when delta24h = +0.05% (boundary, not strictly greater)', () => {
    const r = computeFunding({ avg3Cycle: 0.08, cycleHistory: [], delta24h: 0.05 });
    expect(r.tags.some(t => t.label === '· Rising Fast')).toBe(false);
  });

  it('no Rising Fast tag when delta24h < +0.05%', () => {
    const r = computeFunding({ avg3Cycle: 0.08, cycleHistory: [], delta24h: 0.04 });
    expect(r.tags.some(t => t.label === '· Rising Fast')).toBe(false);
  });

  it('no Rising Fast tag for negative delta', () => {
    const r = computeFunding({ avg3Cycle: 0.08, cycleHistory: [], delta24h: -0.1 });
    expect(r.tags.some(t => t.label === '· Rising Fast')).toBe(false);
  });
});

describe('computeFunding — Unwinding tag', () => {
  // Doc lines 448–449: funding falling from extreme back toward zero
  // → append "· Unwinding" (often precedes relief rally or dump)
  // Condition: band.isExtreme (Overheated Long or Extreme Short) AND delta24h
  // is opposite sign to avg3Cycle (avg>0 with delta24h<0, or avg<0 with delta24h>0).

  it('adds Unwinding tag for Overheated Long with negative delta (moving toward zero)', () => {
    const r = computeFunding({ avg3Cycle: 0.2, cycleHistory: [], delta24h: -0.03 });
    expect(r.tags.some(t => t.label === '· Unwinding')).toBe(true);
  });

  it('Unwinding tag color is amber', () => {
    const r = computeFunding({ avg3Cycle: 0.2, cycleHistory: [], delta24h: -0.03 });
    const tag = r.tags.find(t => t.label === '· Unwinding');
    expect(tag?.color).toBe('amber');
  });

  it('adds Unwinding tag for Extreme Short with positive delta (moving toward zero)', () => {
    const r = computeFunding({ avg3Cycle: -0.15, cycleHistory: [], delta24h: 0.03 });
    expect(r.tags.some(t => t.label === '· Unwinding')).toBe(true);
  });

  it('no Unwinding tag for Overheated Long with positive delta (funding still rising)', () => {
    const r = computeFunding({ avg3Cycle: 0.2, cycleHistory: [], delta24h: 0.03 });
    expect(r.tags.some(t => t.label === '· Unwinding')).toBe(false);
  });

  it('no Unwinding tag for Extreme Short with negative delta (funding still falling)', () => {
    const r = computeFunding({ avg3Cycle: -0.15, cycleHistory: [], delta24h: -0.03 });
    expect(r.tags.some(t => t.label === '· Unwinding')).toBe(false);
  });

  it('no Unwinding tag for non-extreme bands (Crowded Long) even with opposite-sign delta', () => {
    const r = computeFunding({ avg3Cycle: 0.1, cycleHistory: [], delta24h: -0.03 });
    expect(r.tags.some(t => t.label === '· Unwinding')).toBe(false);
  });

  it('no Unwinding tag for non-extreme bands (Crowded Short) even with positive delta', () => {
    const r = computeFunding({ avg3Cycle: -0.08, cycleHistory: [], delta24h: 0.03 });
    expect(r.tags.some(t => t.label === '· Unwinding')).toBe(false);
  });

  it('no Unwinding tag when delta24h is zero (no movement)', () => {
    const r = computeFunding({ avg3Cycle: 0.2, cycleHistory: [], delta24h: 0 });
    expect(r.tags.some(t => t.label === '· Unwinding')).toBe(false);
  });

  it('Unwinding and Rising Fast are mutually exclusive for Overheated Long (Rising Fast requires delta>+0.05, Unwinding requires delta<0)', () => {
    // delta > 0.05 with positive avg → Rising Fast fires, Unwinding cannot (delta not < 0)
    const r = computeFunding({ avg3Cycle: 0.2, cycleHistory: [], delta24h: 0.06 });
    expect(r.tags.some(t => t.label === '· Rising Fast')).toBe(true);
    expect(r.tags.some(t => t.label === '· Unwinding')).toBe(false);
  });

  it('Unwinding and Rising Fast are mutually exclusive for Extreme Short: delta>0.05 triggers Rising Fast not Unwinding', () => {
    // For Extreme Short: Unwinding = delta > 0, Rising Fast = delta > 0.05
    // When delta > 0.05, Rising Fast fires and Unwinding should NOT (Rising Fast supersedes)
    const r = computeFunding({ avg3Cycle: -0.15, cycleHistory: [], delta24h: 0.06 });
    expect(r.tags.some(t => t.label === '· Rising Fast')).toBe(true);
    expect(r.tags.some(t => t.label === '· Unwinding')).toBe(false);
  });

  it('Extreme Short with small positive delta (0 < delta <= 0.05) triggers Unwinding not Rising Fast', () => {
    const r = computeFunding({ avg3Cycle: -0.15, cycleHistory: [], delta24h: 0.03 });
    expect(r.tags.some(t => t.label === '· Unwinding')).toBe(true);
    expect(r.tags.some(t => t.label === '· Rising Fast')).toBe(false);
  });
});

describe('computeFunding — combined modifiers', () => {
  it('both Persistently prefix and Rising Fast tag can coexist', () => {
    const r = computeFunding({
      avg3Cycle: 0.2,
      cycleHistory: [0.18, 0.19, 0.21],
      delta24h: 0.06,
    });
    expect(r.verdict.label).toBe('Persistently Overheated Long');
    expect(r.tags.some(t => t.label === '· Rising Fast')).toBe(true);
  });

  it('both Persistently prefix and Unwinding tag can coexist', () => {
    const r = computeFunding({
      avg3Cycle: 0.2,
      cycleHistory: [0.18, 0.19, 0.21],
      delta24h: -0.03,
    });
    expect(r.verdict.label).toBe('Persistently Overheated Long');
    expect(r.tags.some(t => t.label === '· Unwinding')).toBe(true);
  });

  it('no tags when neutral with low delta', () => {
    const r = computeFunding({ avg3Cycle: 0, cycleHistory: [], delta24h: 0 });
    expect(r.tags).toHaveLength(0);
  });
});
