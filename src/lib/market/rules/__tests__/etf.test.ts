import { describe, it, expect } from 'vitest';
import { computeEtf, type EtfInputs } from '../etf';

// Doc lines 801–856.
// Daily bands (positive = inflow):
//   ≥ +$500M    → "Heavy Institutional Buying"  green   ($500M→Heavy, outer band)
//   +$100M–$500M → "Solid ETF Inflow"           green   ($100M→Solid)
//   +$10M–$100M  → "Mild Inflow"                grey-green ($10M→Mild)
//   −$10M < x < +$10M → "Neutral Flow"          grey    (±$10M → adjacent outer band)
//   −$100M–−$10M → "Mild Outflow"               grey-red (-$10M→Mild, -$100M→Redemptions)
//   −$500M–−$100M→ "ETF Redemptions"            red     (-$500M→Heavy)
//   ≤ −$500M    → "Heavy Institutional Exit"     red
//
// Boundary convention: shared endpoint belongs to the outer (higher-magnitude) band.
//
// 7D cumulative:
//   > +$1B      → "Sustained Institutional Accumulation"
//   +$100M–$1B  → "Net Positive Flow Week"       ($1B→Net Positive)
//   ±$100M      → "Indecisive — Wait and Watch"  (±$100M→Indecisive)
//   < −$100M but > −$1B → "Week of Net Redemptions"
//   ≤ −$1B      → "Sustained Institutional Distribution"

const base: EtfInputs = {
  dailyFlowUsd: 0,
  flow7dUsd: 0,
  priceChange7d: 0,
  coinbasePremiumRising: false,
  exchangeFlow: 'neutral',
};

describe('computeEtf — daily verdict bands', () => {
  it('Heavy Institutional Buying when daily > +$500M', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 600_000_000 });
    expect(r.verdict.label).toBe('Heavy Institutional Buying');
    expect(r.verdict.color).toBe('green');
  });

  it('Heavy Institutional Buying at exactly +$500M (outer band gets boundary)', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 500_000_000 });
    expect(r.verdict.label).toBe('Heavy Institutional Buying');
    expect(r.verdict.color).toBe('green');
  });

  it('Solid ETF Inflow just below +$500M', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 499_000_000 });
    expect(r.verdict.label).toBe('Solid ETF Inflow');
  });

  it('Solid ETF Inflow at +$100M', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 100_000_000 });
    expect(r.verdict.label).toBe('Solid ETF Inflow');
  });

  it('Mild Inflow at exactly +$10M (boundary belongs to outer band)', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 10_000_000 });
    expect(r.verdict.label).toBe('Mild Inflow');
    expect(r.verdict.color).toBe('grey-green');
  });

  it('Neutral Flow just below +$10M', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 9_000_000 });
    expect(r.verdict.label).toBe('Neutral Flow');
    expect(r.verdict.color).toBe('grey');
  });

  it('Neutral Flow at 0', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 0 });
    expect(r.verdict.label).toBe('Neutral Flow');
  });

  it('Mild Outflow at exactly −$10M (boundary belongs to outer band)', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: -10_000_000 });
    expect(r.verdict.label).toBe('Mild Outflow');
    expect(r.verdict.color).toBe('grey-red');
  });

  it('Neutral Flow just above −$10M', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: -9_000_000 });
    expect(r.verdict.label).toBe('Neutral Flow');
  });

  it('ETF Redemptions at exactly −$100M (boundary belongs to outer band)', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: -100_000_000 });
    expect(r.verdict.label).toBe('ETF Redemptions');
    expect(r.verdict.color).toBe('red');
  });

  it('Mild Outflow just above −$100M', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: -99_000_000 });
    expect(r.verdict.label).toBe('Mild Outflow');
  });

  it('Heavy Institutional Exit at exactly −$500M (boundary belongs to outer band)', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: -500_000_000 });
    expect(r.verdict.label).toBe('Heavy Institutional Exit');
    expect(r.verdict.color).toBe('red');
  });

  it('ETF Redemptions just above −$500M', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: -499_000_000 });
    expect(r.verdict.label).toBe('ETF Redemptions');
  });

  it('Heavy Institutional Exit well below −$500M', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: -600_000_000 });
    expect(r.verdict.label).toBe('Heavy Institutional Exit');
  });
});

describe('computeEtf — 7D cumulative verdict', () => {
  it('Sustained Institutional Accumulation when 7D > +$1B', () => {
    const r = computeEtf({ ...base, flow7dUsd: 1_100_000_000 });
    expect(r.cumulative7d.label).toBe('Sustained Institutional Accumulation');
    expect(r.cumulative7d.color).toBe('green');
  });

  it('Net Positive Flow Week at exactly +$1B (not > $1B)', () => {
    const r = computeEtf({ ...base, flow7dUsd: 1_000_000_000 });
    expect(r.cumulative7d.label).toBe('Net Positive Flow Week');
  });

  it('Net Positive Flow Week at +$100M', () => {
    const r = computeEtf({ ...base, flow7dUsd: 100_000_000 });
    expect(r.cumulative7d.label).toBe('Net Positive Flow Week');
  });

  it('Indecisive at 0', () => {
    const r = computeEtf({ ...base, flow7dUsd: 0 });
    expect(r.cumulative7d.label).toBe('Indecisive — Wait and Watch');
    expect(r.cumulative7d.color).toBe('grey');
  });

  it('Indecisive at exactly −$100M (inclusive)', () => {
    const r = computeEtf({ ...base, flow7dUsd: -100_000_000 });
    expect(r.cumulative7d.label).toBe('Indecisive — Wait and Watch');
  });

  it('Week of Net Redemptions just below −$100M', () => {
    const r = computeEtf({ ...base, flow7dUsd: -101_000_000 });
    expect(r.cumulative7d.label).toBe('Week of Net Redemptions');
    expect(r.cumulative7d.color).toBe('grey-red');
  });

  it('Sustained Institutional Distribution at −$1B', () => {
    const r = computeEtf({ ...base, flow7dUsd: -1_000_000_000 });
    expect(r.cumulative7d.label).toBe('Sustained Institutional Distribution');
    expect(r.cumulative7d.color).toBe('red');
  });
});

describe('computeEtf — cross-signals', () => {
  it('Dual Institutional Signal when Heavy inflow + coinbasePremiumRising', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 600_000_000, coinbasePremiumRising: true });
    expect(r.tags.some(t => t.label === 'Dual Institutional Signal')).toBe(true);
    expect(r.tags.find(t => t.label === 'Dual Institutional Signal')?.color).toBe('green');
  });

  it('no Dual Institutional Signal for non-heavy inflow', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 200_000_000, coinbasePremiumRising: true });
    expect(r.tags.some(t => t.label === 'Dual Institutional Signal')).toBe(false);
  });

  it('Institutional Exit Confirmed when Heavy outflow + exchange inflow', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: -600_000_000, exchangeFlow: 'inflow' });
    expect(r.tags.some(t => t.label === 'Institutional Exit Confirmed')).toBe(true);
    expect(r.tags.find(t => t.label === 'Institutional Exit Confirmed')?.color).toBe('red');
  });

  it('no Institutional Exit Confirmed for non-heavy outflow', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: -200_000_000, exchangeFlow: 'inflow' });
    expect(r.tags.some(t => t.label === 'Institutional Exit Confirmed')).toBe(false);
  });

  it('Accumulating Into Weakness when any inflow + price flat', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 50_000_000, priceChange7d: 0 });
    expect(r.tags.some(t => t.label === 'Accumulating Into Weakness')).toBe(true);
    expect(r.tags.find(t => t.label === 'Accumulating Into Weakness')?.color).toBe('green');
  });

  it('Accumulating Into Weakness when any inflow + price down', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 50_000_000, priceChange7d: -0.03 });
    expect(r.tags.some(t => t.label === 'Accumulating Into Weakness')).toBe(true);
  });

  it('no Accumulating Into Weakness when inflow + price rising', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: 50_000_000, priceChange7d: 0.02 });
    expect(r.tags.some(t => t.label === 'Accumulating Into Weakness')).toBe(false);
  });

  it('Selling Into Strength when any outflow + price rising', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: -50_000_000, priceChange7d: 0.03 });
    expect(r.tags.some(t => t.label === 'Selling Into Strength')).toBe(true);
    expect(r.tags.find(t => t.label === 'Selling Into Strength')?.color).toBe('amber');
  });

  it('no Selling Into Strength when outflow + price flat', () => {
    const r = computeEtf({ ...base, dailyFlowUsd: -50_000_000, priceChange7d: 0 });
    expect(r.tags.some(t => t.label === 'Selling Into Strength')).toBe(false);
  });

  it('multiple cross-signal tags can coexist', () => {
    // Heavy inflow + premium rising → Dual Institutional Signal
    // AND inflow + price flat → Accumulating Into Weakness
    const r = computeEtf({
      dailyFlowUsd: 600_000_000,
      flow7dUsd: 0,
      priceChange7d: -0.01,
      coinbasePremiumRising: true,
      exchangeFlow: 'neutral',
    });
    expect(r.tags.some(t => t.label === 'Dual Institutional Signal')).toBe(true);
    expect(r.tags.some(t => t.label === 'Accumulating Into Weakness')).toBe(true);
  });
});
