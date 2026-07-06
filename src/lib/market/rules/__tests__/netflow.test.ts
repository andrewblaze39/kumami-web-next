import { describe, it, expect } from 'vitest';
import { computeNetflow, type NetflowInputs } from '../netflow';

// Doc lines 526–554 (detailed), 216–229 (summary).
//
// net = outflow - inflow (positive = net outflow = accumulation)
//
// Full band table from detailed doc (lines 531–536):
//   Net outflow > $1B        → "Strong Accumulation"   (green)
//   Net outflow $200M–$1B    → "Accumulation"          (green)
//   Net outflow $0–$200M     → "Mild Accumulation"     (grey-green)
//   Near zero ±$50M          → "Neutral"               (grey)
//   Net inflow $0–$200M      → "Mild Distribution"     (grey-red)
//   Net inflow $200M–$1B     → "Distribution"          (red)
//   Net inflow > $1B         → "Heavy Distribution"    (red)
//
// NOTE: Summary (lines 219-222) shows a simplified 5-band table without
// "Mild Accumulation" and "Mild Distribution". Detailed doc wins.
//
// Boundary decisions:
//   "Near zero ±$50M" zone: -50M ≤ net ≤ +50M → Neutral
//   "Net outflow $0–$200M": net > 50M and ≤ 200M → Mild Accumulation
//   "Net inflow $0–$200M": net < -50M and ≥ -200M → Mild Distribution
//   "Net outflow $200M–$1B": net > 200M and ≤ 1B → Accumulation
//   "Net inflow $200M–$1B": net < -200M and ≥ -1B → Distribution
//   At exact boundaries: $50M outflow → Neutral (top of neutral zone)
//     $200M outflow → Accumulation (200M exactly = lower bound of Accumulation band)
//     $1B outflow → Strong Accumulation (1B exactly = lower bound of Strong band)
//   Same logic mirrors on the inflow (negative) side.
//
// Divergence tags (lines 540–554):
//   priceUp + netInflow growing  → "· Distribution into Strength"
//   priceDown + netOutflow growing → "· Accumulation on Dip"
//   priceUp + netOutflow growing → "· Conviction Rally"
//   priceDown + netInflow growing → "· Panic Selling"
// These are appended as tags.

describe('computeNetflow — base verdict magnitude bands', () => {
  it('Strong Accumulation for net outflow > $1B', () => {
    const r = computeNetflow({ netUsd: 1_100_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Strong Accumulation');
    expect(r.verdict.color).toBe('green');
  });

  it('Strong Accumulation at exactly $1B', () => {
    // $1B exactly = lower bound of Strong band (> $1B strictly per doc; but "outflow $200M–$1B"
    // means $1B is NOT in Accumulation band either → treat $1B as Strong Accumulation boundary)
    // Decision: $1B included in Strong Accumulation (net ≥ 1B → Strong)
    const r = computeNetflow({ netUsd: 1_000_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Strong Accumulation');
  });

  it('Accumulation for $200M to just under $1B', () => {
    const r = computeNetflow({ netUsd: 500_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Accumulation');
    expect(r.verdict.color).toBe('green');
  });

  it('Accumulation at exactly $200M', () => {
    const r = computeNetflow({ netUsd: 200_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Accumulation');
  });

  it('Mild Accumulation for outflow $51M to $199M', () => {
    const r = computeNetflow({ netUsd: 100_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Mild Accumulation');
    expect(r.verdict.color).toBe('grey-green');
  });

  it('Neutral at exactly $50M outflow', () => {
    const r = computeNetflow({ netUsd: 50_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Neutral');
    expect(r.verdict.color).toBe('grey');
  });

  it('Neutral at zero', () => {
    const r = computeNetflow({ netUsd: 0, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Neutral');
  });

  it('Neutral at -$50M (inflow ±$50M zone)', () => {
    const r = computeNetflow({ netUsd: -50_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Neutral');
  });

  it('Mild Distribution for inflow $51M to $199M', () => {
    const r = computeNetflow({ netUsd: -100_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Mild Distribution');
    expect(r.verdict.color).toBe('grey-red');
  });

  it('Distribution at exactly -$200M', () => {
    const r = computeNetflow({ netUsd: -200_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Distribution');
    expect(r.verdict.color).toBe('red');
  });

  it('Distribution for inflow $200M–$1B', () => {
    const r = computeNetflow({ netUsd: -500_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Distribution');
  });

  it('Heavy Distribution at -$1B', () => {
    const r = computeNetflow({ netUsd: -1_000_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Heavy Distribution');
    expect(r.verdict.color).toBe('red');
  });

  it('Heavy Distribution beyond -$1B', () => {
    const r = computeNetflow({ netUsd: -2_000_000_000, priceChange: 0, flowAccelerating: false });
    expect(r.verdict.label).toBe('Heavy Distribution');
  });
});

describe('computeNetflow — price divergence tags', () => {
  // priceChange > 0 = price up, < 0 = price down
  // netUsd > 0 = net outflow (accumulation), < 0 = net inflow (distribution)
  // flowAccelerating = true when flow is growing/intensifying in the measured direction

  it('Distribution into Strength: price up + net inflow growing', () => {
    const r = computeNetflow({ netUsd: -300_000_000, priceChange: 0.05, flowAccelerating: true });
    expect(r.tags.some(t => t.label === '· Distribution into Strength')).toBe(true);
  });

  it('Accumulation on Dip: price down + net outflow growing', () => {
    const r = computeNetflow({ netUsd: 300_000_000, priceChange: -0.05, flowAccelerating: true });
    expect(r.tags.some(t => t.label === '· Accumulation on Dip')).toBe(true);
  });

  it('Conviction Rally: price up + net outflow growing', () => {
    const r = computeNetflow({ netUsd: 300_000_000, priceChange: 0.05, flowAccelerating: true });
    expect(r.tags.some(t => t.label === '· Conviction Rally')).toBe(true);
  });

  it('Panic Selling: price down + net inflow growing', () => {
    const r = computeNetflow({ netUsd: -300_000_000, priceChange: -0.05, flowAccelerating: true });
    expect(r.tags.some(t => t.label === '· Panic Selling')).toBe(true);
  });

  it('no divergence tag when flowAccelerating = false', () => {
    const r = computeNetflow({ netUsd: -300_000_000, priceChange: 0.05, flowAccelerating: false });
    expect(r.tags).toHaveLength(0);
  });

  it('no divergence tag when price change is zero', () => {
    const r = computeNetflow({ netUsd: 300_000_000, priceChange: 0, flowAccelerating: true });
    expect(r.tags).toHaveLength(0);
  });
});
