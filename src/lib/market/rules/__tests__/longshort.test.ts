import { describe, it, expect } from 'vitest';
import { computeLongShort, type LongShortInputs } from '../longshort';

// Doc lines 576–621 (detailed)
//
// Global % long bands:
//   > 75%       → "Extremely Crowded Long"   (red)
//   65–75%      → "Crowded Long"             (amber)
//   55–65%      → "Long Bias"                (grey-green)
//   45–55%      → "Balanced"                 (grey)
//   35–45%      → "Short Bias"               (grey-red)
//   25–35%      → "Crowded Short"            (amber)
//   < 25%       → "Extremely Crowded Short"  (green)
//
// Boundary decisions (doc says "65-75%" without explicit inclusive/exclusive):
//   > 75% strictly → Extremely Crowded Long; 75% itself → Crowded Long
//   65-75% inclusive on both ends → Crowded Long
//   55-65% inclusive → Long Bias
//   45-55% inclusive → Balanced
//   35-45% inclusive → Short Bias
//   25-35% inclusive → Crowded Short
//   < 25% strictly → Extremely Crowded Short; 25% itself → Crowded Short
//
// Smart money divergence (doc lines 607-620):
//   gap = |globalPctLong - topTraderPctLong|
//   Crowd long (>55%), smart money neutral/short (>15% gap below crowd):
//     → "· Smart Money Fading the Crowd"
//   Crowd neutral (~45%), smart money long (>15% gap above crowd):
//     → "· Smart Money Leading Long"
//   Both aligned (within 10%): no tag
//   Doc says gap > 15% triggers divergence. Decision: use >15% strict.
//   Specifically: if topTrader is more than 15% LOWER than global → Fading
//                 if topTrader is more than 15% HIGHER than global → Leading

describe('computeLongShort — global long % bands', () => {
  it('Extremely Crowded Long when > 75%', () => {
    const r = computeLongShort({ globalPctLong: 80, topTraderPctLong: 80 });
    expect(r.verdict.label).toBe('Extremely Crowded Long');
    expect(r.verdict.color).toBe('red');
  });

  it('Extremely Crowded Long at 75.1%', () => {
    const r = computeLongShort({ globalPctLong: 75.1, topTraderPctLong: 75.1 });
    expect(r.verdict.label).toBe('Extremely Crowded Long');
  });

  it('Crowded Long at exactly 75%', () => {
    const r = computeLongShort({ globalPctLong: 75, topTraderPctLong: 75 });
    expect(r.verdict.label).toBe('Crowded Long');
    expect(r.verdict.color).toBe('amber');
  });

  it('Crowded Long at 65%', () => {
    const r = computeLongShort({ globalPctLong: 65, topTraderPctLong: 65 });
    expect(r.verdict.label).toBe('Crowded Long');
  });

  it('Long Bias at 64.9%', () => {
    const r = computeLongShort({ globalPctLong: 64.9, topTraderPctLong: 64.9 });
    expect(r.verdict.label).toBe('Long Bias');
    expect(r.verdict.color).toBe('grey-green');
  });

  it('Long Bias at 55%', () => {
    const r = computeLongShort({ globalPctLong: 55, topTraderPctLong: 55 });
    expect(r.verdict.label).toBe('Long Bias');
  });

  it('Balanced at 54.9%', () => {
    const r = computeLongShort({ globalPctLong: 54.9, topTraderPctLong: 54.9 });
    expect(r.verdict.label).toBe('Balanced');
    expect(r.verdict.color).toBe('grey');
  });

  it('Balanced at 50%', () => {
    const r = computeLongShort({ globalPctLong: 50, topTraderPctLong: 50 });
    expect(r.verdict.label).toBe('Balanced');
  });

  it('Balanced at 45%', () => {
    const r = computeLongShort({ globalPctLong: 45, topTraderPctLong: 45 });
    expect(r.verdict.label).toBe('Balanced');
  });

  it('Short Bias at 44.9%', () => {
    const r = computeLongShort({ globalPctLong: 44.9, topTraderPctLong: 44.9 });
    expect(r.verdict.label).toBe('Short Bias');
    expect(r.verdict.color).toBe('grey-red');
  });

  it('Short Bias at 35%', () => {
    const r = computeLongShort({ globalPctLong: 35, topTraderPctLong: 35 });
    expect(r.verdict.label).toBe('Short Bias');
  });

  it('Crowded Short at 34.9%', () => {
    const r = computeLongShort({ globalPctLong: 34.9, topTraderPctLong: 34.9 });
    expect(r.verdict.label).toBe('Crowded Short');
    expect(r.verdict.color).toBe('amber');
  });

  it('Crowded Short at 25%', () => {
    const r = computeLongShort({ globalPctLong: 25, topTraderPctLong: 25 });
    expect(r.verdict.label).toBe('Crowded Short');
  });

  it('Extremely Crowded Short at 24.9%', () => {
    const r = computeLongShort({ globalPctLong: 24.9, topTraderPctLong: 24.9 });
    expect(r.verdict.label).toBe('Extremely Crowded Short');
    expect(r.verdict.color).toBe('green');
  });

  it('Extremely Crowded Short at 0%', () => {
    const r = computeLongShort({ globalPctLong: 0, topTraderPctLong: 0 });
    expect(r.verdict.label).toBe('Extremely Crowded Short');
  });
});

describe('computeLongShort — smart money divergence tags', () => {
  it('Smart Money Fading the Crowd: crowd long, smart money >15% lower', () => {
    // Doc example: global 70% long, top traders 45% long → 25% gap
    const r = computeLongShort({ globalPctLong: 70, topTraderPctLong: 45 });
    expect(r.tags.some(t => t.label === '· Smart Money Fading the Crowd')).toBe(true);
  });

  it('Smart Money Fading: gap exactly 15% does NOT trigger (strict >15%)', () => {
    const r = computeLongShort({ globalPctLong: 70, topTraderPctLong: 55 });
    expect(r.tags.some(t => t.label === '· Smart Money Fading the Crowd')).toBe(false);
  });

  it('Smart Money Fading: gap 15.1% DOES trigger', () => {
    const r = computeLongShort({ globalPctLong: 70, topTraderPctLong: 54.9 });
    expect(r.tags.some(t => t.label === '· Smart Money Fading the Crowd')).toBe(true);
  });

  it('Smart Money Leading Long: crowd neutral, smart money >15% higher', () => {
    // Doc example: global 45% long, top traders 70% long → 25% gap
    const r = computeLongShort({ globalPctLong: 45, topTraderPctLong: 70 });
    expect(r.tags.some(t => t.label === '· Smart Money Leading Long')).toBe(true);
  });

  it('Smart Money Leading: gap exactly 15% does NOT trigger', () => {
    const r = computeLongShort({ globalPctLong: 45, topTraderPctLong: 60 });
    expect(r.tags.some(t => t.label === '· Smart Money Leading Long')).toBe(false);
  });

  it('Smart Money Leading: gap 15.1% DOES trigger', () => {
    const r = computeLongShort({ globalPctLong: 45, topTraderPctLong: 60.1 });
    expect(r.tags.some(t => t.label === '· Smart Money Leading Long')).toBe(true);
  });

  it('no divergence tag when within 10%', () => {
    const r = computeLongShort({ globalPctLong: 60, topTraderPctLong: 55 });
    expect(r.tags).toHaveLength(0);
  });

  it('no divergence tag when aligned', () => {
    const r = computeLongShort({ globalPctLong: 60, topTraderPctLong: 60 });
    expect(r.tags).toHaveLength(0);
  });
});
