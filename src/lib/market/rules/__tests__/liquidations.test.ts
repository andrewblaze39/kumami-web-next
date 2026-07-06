import { describe, it, expect } from 'vitest';
import { computeLiquidations, type LiquidationInputs } from '../liquidations';

// Doc lines 466–509
// long_ratio = long_liq / total_liq
// Step 2 size thresholds:
//   Total < $50M    → LOW significance
//   Total $50-200M  → MEDIUM significance
//   Total > $200M   → HIGH significance
//
// Step 3 verdict matrix:
//   long_ratio > 70% + HIGH   → "Mass Long Flush"        (green)
//   long_ratio > 70% + MEDIUM → "Long Cleanup"           (grey-green)
//   long_ratio < 30% + HIGH   → "Short Squeeze"          (red)
//   long_ratio < 30% + MEDIUM → "Short Cleanup"          (grey)
//   long_ratio 40-60% (any)   → "Balanced Liquidations"  (grey)
//
// LOW significance is not covered by the ratio matrix → use "Insignificant" (grey)
// Edge decision: long_ratio 30–40% or 60–70% with any size not explicitly covered.
//   Decision: treat 30–40% as "Short Bias Liquidations" (grey-red) and 60–70% as
//   "Long Bias Liquidations" (grey-green) to cover the gap. Actually doc doesn't name these —
//   simpler decision: anything 30–70% with MEDIUM/HIGH that doesn't match 40–60% "balanced"
//   falls through to "Balanced Liquidations" as the doc's 40–60% covers the middle.
//   The doc is silent on 30–40% + MEDIUM/HIGH and 60–70% + MEDIUM/HIGH.
//   Decision: 30–40% = "Short Bias" variants, 60–70% = "Long Bias" variants (grey colors).
//   Document this in code comment.
//
// Step 4: Total > $500M → prepend "Cascade — "
//
// Boundary decisions:
//   long_ratio = 70% is NOT > 70%, so it falls out of "Mass Long Flush" → to "Long Bias" range
//   long_ratio = 30% is NOT < 30%, so it falls out of "Short Squeeze" → to "Short Bias" range
//   Total = 50M is $50M → MEDIUM (50-200 inclusive lower bound)
//   Total = 200M → HIGH (doc says >200M HIGH; 200M itself is MEDIUM)
//   Total = 500M → not > 500M, so no Cascade prefix (500M itself = boundary, no prefix)

describe('computeLiquidations — size significance', () => {
  it('LOW significance for total < $50M', () => {
    const r = computeLiquidations({ totalUsd: 49_000_000, longRatio: 0.5 });
    expect(r.significance).toBe('LOW');
  });

  it('MEDIUM significance at exactly $50M', () => {
    const r = computeLiquidations({ totalUsd: 50_000_000, longRatio: 0.5 });
    expect(r.significance).toBe('MEDIUM');
  });

  it('MEDIUM significance at $200M exactly', () => {
    const r = computeLiquidations({ totalUsd: 200_000_000, longRatio: 0.5 });
    expect(r.significance).toBe('MEDIUM');
  });

  it('HIGH significance just above $200M', () => {
    const r = computeLiquidations({ totalUsd: 200_000_001, longRatio: 0.5 });
    expect(r.significance).toBe('HIGH');
  });

  it('HIGH significance at $500M', () => {
    const r = computeLiquidations({ totalUsd: 500_000_000, longRatio: 0.71 });
    expect(r.significance).toBe('HIGH');
  });
});

describe('computeLiquidations — verdict matrix', () => {
  it('Mass Long Flush: long_ratio > 70% + HIGH', () => {
    const r = computeLiquidations({ totalUsd: 250_000_000, longRatio: 0.71 });
    expect(r.verdict.label).toContain('Mass Long Flush');
    expect(r.verdict.color).toBe('green');
  });

  it('boundary: long_ratio exactly 70% + HIGH is NOT Mass Long Flush (not > 70%)', () => {
    const r = computeLiquidations({ totalUsd: 250_000_000, longRatio: 0.70 });
    expect(r.verdict.label).not.toContain('Mass Long Flush');
  });

  it('Long Cleanup: long_ratio > 70% + MEDIUM', () => {
    const r = computeLiquidations({ totalUsd: 100_000_000, longRatio: 0.75 });
    expect(r.verdict.label).toContain('Long Cleanup');
    expect(r.verdict.color).toBe('grey-green');
  });

  it('Short Squeeze: long_ratio < 30% + HIGH', () => {
    const r = computeLiquidations({ totalUsd: 250_000_000, longRatio: 0.29 });
    expect(r.verdict.label).toContain('Short Squeeze');
    expect(r.verdict.color).toBe('red');
  });

  it('boundary: long_ratio exactly 30% + HIGH is NOT Short Squeeze (not < 30%)', () => {
    const r = computeLiquidations({ totalUsd: 250_000_000, longRatio: 0.30 });
    expect(r.verdict.label).not.toContain('Short Squeeze');
  });

  it('Short Cleanup: long_ratio < 30% + MEDIUM', () => {
    const r = computeLiquidations({ totalUsd: 100_000_000, longRatio: 0.20 });
    expect(r.verdict.label).toContain('Short Cleanup');
    expect(r.verdict.color).toBe('grey');
  });

  it('Balanced Liquidations: long_ratio 40–60%', () => {
    const r = computeLiquidations({ totalUsd: 100_000_000, longRatio: 0.50 });
    expect(r.verdict.label).toContain('Balanced Liquidations');
    expect(r.verdict.color).toBe('grey');
  });

  it('Balanced Liquidations at 40% boundary', () => {
    const r = computeLiquidations({ totalUsd: 100_000_000, longRatio: 0.40 });
    expect(r.verdict.label).toContain('Balanced Liquidations');
  });

  it('Balanced Liquidations at 60% boundary', () => {
    const r = computeLiquidations({ totalUsd: 100_000_000, longRatio: 0.60 });
    expect(r.verdict.label).toContain('Balanced Liquidations');
  });

  it('LOW significance returns low-prominence verdict', () => {
    const r = computeLiquidations({ totalUsd: 10_000_000, longRatio: 0.8 });
    expect(r.verdict.color).toBe('grey');
    expect(r.significance).toBe('LOW');
  });
});

describe('computeLiquidations — Cascade prefix', () => {
  it('adds Cascade prefix when total > $500M', () => {
    const r = computeLiquidations({ totalUsd: 501_000_000, longRatio: 0.75 });
    expect(r.verdict.label).toMatch(/^Cascade — /);
  });

  it('Cascade prefix with Mass Long Flush', () => {
    const r = computeLiquidations({ totalUsd: 600_000_000, longRatio: 0.75 });
    expect(r.verdict.label).toBe('Cascade — Mass Long Flush');
    expect(r.verdict.color).toBe('green');
  });

  it('Cascade prefix with Short Squeeze', () => {
    const r = computeLiquidations({ totalUsd: 600_000_000, longRatio: 0.20 });
    expect(r.verdict.label).toBe('Cascade — Short Squeeze');
  });

  it('no Cascade prefix at exactly $500M boundary', () => {
    const r = computeLiquidations({ totalUsd: 500_000_000, longRatio: 0.75 });
    expect(r.verdict.label).not.toMatch(/^Cascade/);
  });

  it('no Cascade prefix below $500M', () => {
    const r = computeLiquidations({ totalUsd: 300_000_000, longRatio: 0.75 });
    expect(r.verdict.label).not.toMatch(/^Cascade/);
  });
});
