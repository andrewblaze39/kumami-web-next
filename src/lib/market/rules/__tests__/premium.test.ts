import { describe, it, expect } from 'vitest';
import { computePremium, type PremiumInputs } from '../premium';

// Doc lines 737–798 (detailed), 281–297 (summary).
// Bands (premium as decimal):
//   > +0.3%   (> 0.003)  → "Strong US Premium"   green
//   +0.1–0.3% (0.001–0.003 exclusive) → "Mild US Premium"  grey-green
//   ±0.1%     (−0.001 to +0.001 incl) → "Neutral"          grey
//   −0.3–−0.1% (−0.003 to −0.001 excl) → "Offshore Leading" amber
//   < −0.3%   (< −0.003) → "US Discount"          red
//
// Boundary decisions:
//   +0.3% exactly → Mild US Premium (NOT Strong; Strong requires strictly > 0.3%)
//   +0.1% exactly → Neutral (inclusive boundary)
//   −0.1% exactly → Neutral (inclusive boundary)
//   −0.3% exactly → Offshore Leading (NOT US Discount; US Discount requires strictly < −0.3%)

const noTrend: PremiumInputs['trend7d'] = 'none';
const neutral: PremiumInputs['exchangeFlow'] = 'neutral';

describe('computePremium — base verdict bands', () => {
  it('Strong US Premium when premium > +0.3%', () => {
    const r = computePremium({ premium: 0.004, trend7d: noTrend, exchangeFlow: neutral });
    expect(r.verdict.label).toBe('Strong US Premium');
    expect(r.verdict.color).toBe('green');
  });

  it('Strong US Premium just above +0.3% boundary', () => {
    const r = computePremium({ premium: 0.0031, trend7d: noTrend, exchangeFlow: neutral });
    expect(r.verdict.label).toBe('Strong US Premium');
  });

  it('Mild US Premium at exactly +0.3% (boundary belongs to Mild)', () => {
    const r = computePremium({ premium: 0.003, trend7d: noTrend, exchangeFlow: neutral });
    expect(r.verdict.label).toBe('Mild US Premium');
    expect(r.verdict.color).toBe('grey-green');
  });

  it('Mild US Premium just above +0.1%', () => {
    const r = computePremium({ premium: 0.0011, trend7d: noTrend, exchangeFlow: neutral });
    expect(r.verdict.label).toBe('Mild US Premium');
  });

  it('Neutral at exactly +0.1% (inclusive boundary)', () => {
    const r = computePremium({ premium: 0.001, trend7d: noTrend, exchangeFlow: neutral });
    expect(r.verdict.label).toBe('Neutral');
    expect(r.verdict.color).toBe('grey');
  });

  it('Neutral at 0%', () => {
    const r = computePremium({ premium: 0, trend7d: noTrend, exchangeFlow: neutral });
    expect(r.verdict.label).toBe('Neutral');
  });

  it('Neutral at exactly −0.1% (inclusive boundary)', () => {
    const r = computePremium({ premium: -0.001, trend7d: noTrend, exchangeFlow: neutral });
    expect(r.verdict.label).toBe('Neutral');
  });

  it('Offshore Leading just below −0.1%', () => {
    const r = computePremium({ premium: -0.0011, trend7d: noTrend, exchangeFlow: neutral });
    expect(r.verdict.label).toBe('Offshore Leading');
    expect(r.verdict.color).toBe('amber');
  });

  it('Offshore Leading at exactly −0.3% (boundary belongs to Offshore Leading)', () => {
    const r = computePremium({ premium: -0.003, trend7d: noTrend, exchangeFlow: neutral });
    expect(r.verdict.label).toBe('Offshore Leading');
  });

  it('US Discount just below −0.3%', () => {
    const r = computePremium({ premium: -0.0031, trend7d: noTrend, exchangeFlow: neutral });
    expect(r.verdict.label).toBe('US Discount');
    expect(r.verdict.color).toBe('red');
  });

  it('US Discount well below −0.3%', () => {
    const r = computePremium({ premium: -0.01, trend7d: noTrend, exchangeFlow: neutral });
    expect(r.verdict.label).toBe('US Discount');
  });
});

describe('computePremium — 7D trend modifiers', () => {
  it('adds Sustained Institutional Demand tag when positive_streak', () => {
    const r = computePremium({ premium: 0.002, trend7d: 'positive_streak', exchangeFlow: neutral });
    expect(r.tags.some(t => t.label === '· Sustained Institutional Demand')).toBe(true);
    expect(r.tags.find(t => t.label === '· Sustained Institutional Demand')?.color).toBe('green');
  });

  it('adds US Demand Returning tag when flipped_positive', () => {
    const r = computePremium({ premium: 0.002, trend7d: 'flipped_positive', exchangeFlow: neutral });
    expect(r.tags.some(t => t.label === '· US Demand Returning')).toBe(true);
    expect(r.tags.find(t => t.label === '· US Demand Returning')?.color).toBe('green');
  });

  it('adds US Demand Fading tag when flipped_negative', () => {
    const r = computePremium({ premium: -0.002, trend7d: 'flipped_negative', exchangeFlow: neutral });
    expect(r.tags.some(t => t.label === '· US Demand Fading')).toBe(true);
    expect(r.tags.find(t => t.label === '· US Demand Fading')?.color).toBe('amber');
  });

  it('no trend tags when trend7d is none', () => {
    const r = computePremium({ premium: 0.002, trend7d: 'none', exchangeFlow: neutral });
    expect(r.tags).toHaveLength(0);
  });
});

describe('computePremium — cross-signal overrides', () => {
  it('Institutional Accumulation Signal when Strong US Premium + outflow', () => {
    const r = computePremium({ premium: 0.004, trend7d: noTrend, exchangeFlow: 'outflow' });
    expect(r.verdict.label).toBe('Institutional Accumulation Signal');
    expect(r.verdict.color).toBe('green');
  });

  it('no cross-signal override for Mild US Premium + outflow (not Strong)', () => {
    const r = computePremium({ premium: 0.002, trend7d: noTrend, exchangeFlow: 'outflow' });
    expect(r.verdict.label).toBe('Mild US Premium');
  });

  it('Retail Distribution Signal when US Discount + inflow', () => {
    const r = computePremium({ premium: -0.005, trend7d: noTrend, exchangeFlow: 'inflow' });
    expect(r.verdict.label).toBe('Retail Distribution Signal');
    expect(r.verdict.color).toBe('red');
  });

  it('no cross-signal override for Offshore Leading + inflow (not US Discount)', () => {
    const r = computePremium({ premium: -0.002, trend7d: noTrend, exchangeFlow: 'inflow' });
    expect(r.verdict.label).toBe('Offshore Leading');
  });

  it('no cross-signal override for Strong US Premium + neutral flow', () => {
    const r = computePremium({ premium: 0.004, trend7d: noTrend, exchangeFlow: 'neutral' });
    expect(r.verdict.label).toBe('Strong US Premium');
  });

  it('cross-signal + trend tag can coexist', () => {
    const r = computePremium({ premium: 0.004, trend7d: 'positive_streak', exchangeFlow: 'outflow' });
    expect(r.verdict.label).toBe('Institutional Accumulation Signal');
    expect(r.tags.some(t => t.label === '· Sustained Institutional Demand')).toBe(true);
  });
});
