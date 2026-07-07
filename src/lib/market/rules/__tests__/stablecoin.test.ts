import { describe, it, expect } from 'vitest';
import { computeStablecoin } from '../stablecoin';

// Doc lines 871–881, 327–335.
// 30D change bands (fraction, e.g. 0.05 = 5%):
//   > +5%      → "Dry Powder Building"   green
//   +1%–+5%    → "Mild Capital Inflow"   grey-green  (+5% boundary → Mild; +1% → Mild)
//   strictly −1% to +1% → "Neutral"     grey        (both ±1% belong to adjacent band)
//   −5%–−1%    → "Capital Deploying"    grey        (−1% → Capital Deploying)
//   < −5%      → "Stablecoin Drain"     amber       (−5% → Stablecoin Drain)

describe('computeStablecoin — base verdict bands', () => {
  it('Dry Powder Building when change > +5%', () => {
    const r = computeStablecoin({ change30d: 0.06 });
    expect(r.verdict.label).toBe('Dry Powder Building');
    expect(r.verdict.color).toBe('green');
  });

  it('Mild Capital Inflow at exactly +5% (boundary belongs to outer band = Mild)', () => {
    const r = computeStablecoin({ change30d: 0.05 });
    expect(r.verdict.label).toBe('Mild Capital Inflow');
    expect(r.verdict.color).toBe('grey-green');
  });

  it('Mild Capital Inflow at +3%', () => {
    const r = computeStablecoin({ change30d: 0.03 });
    expect(r.verdict.label).toBe('Mild Capital Inflow');
  });

  it('Mild Capital Inflow at exactly +1% (outer band gets boundary)', () => {
    const r = computeStablecoin({ change30d: 0.01 });
    expect(r.verdict.label).toBe('Mild Capital Inflow');
  });

  it('Neutral just above +1%... wait — +1% is Mild, so just below +1% is Neutral', () => {
    const r = computeStablecoin({ change30d: 0.009 });
    expect(r.verdict.label).toBe('Neutral');
    expect(r.verdict.color).toBe('grey');
  });

  it('Neutral at 0%', () => {
    const r = computeStablecoin({ change30d: 0 });
    expect(r.verdict.label).toBe('Neutral');
  });

  it('Neutral just above −1% (strictly inside Neutral band)', () => {
    const r = computeStablecoin({ change30d: -0.009 });
    expect(r.verdict.label).toBe('Neutral');
  });

  it('Capital Deploying at exactly −1% (outer band gets boundary)', () => {
    const r = computeStablecoin({ change30d: -0.01 });
    expect(r.verdict.label).toBe('Capital Deploying');
    expect(r.verdict.color).toBe('grey');
  });

  it('Capital Deploying at −3%', () => {
    const r = computeStablecoin({ change30d: -0.03 });
    expect(r.verdict.label).toBe('Capital Deploying');
  });

  it('Stablecoin Drain at exactly −5% (outer band gets boundary)', () => {
    const r = computeStablecoin({ change30d: -0.05 });
    expect(r.verdict.label).toBe('Stablecoin Drain');
    expect(r.verdict.color).toBe('amber');
  });

  it('Stablecoin Drain well below −5%', () => {
    const r = computeStablecoin({ change30d: -0.10 });
    expect(r.verdict.label).toBe('Stablecoin Drain');
  });
});

describe('computeStablecoin — tags are always empty (no modifiers in doc)', () => {
  it('no tags returned for any band', () => {
    const cases = [0.06, 0.03, 0, -0.03, -0.08];
    for (const c of cases) {
      const r = computeStablecoin({ change30d: c });
      expect(r.tags).toHaveLength(0);
    }
  });
});
