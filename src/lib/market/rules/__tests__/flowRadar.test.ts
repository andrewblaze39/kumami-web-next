import { describe, it, expect } from 'vitest';
import { computeFlowRadar } from '../flowRadar';

// Doc lines 133–154 (Console), 1094–1145 (detailed).
// Per-event thresholds:
//   whale_transfer: ≥$100M HIGH · ≥$10M MED · <$10M LOW
//   exchange_flow:  ≥$500M HIGH · ≥$100M MED · <$100M LOW
//   liq_spike:      ≥$200M HIGH · ≥$50M MED  · <$50M LOW
//   netflow_flip:   always MED
//   whale_wall:     >$50M within 5% of price → MED; else LOW
//   smart_money:    confidence > 0.8 → HIGH; else MED

describe('computeFlowRadar — whale_transfer', () => {
  it('HIGH when > $100M', () => {
    const r = computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 150_000_000, toExchange: true });
    expect(r.severity).toBe('HIGH');
  });

  it('HIGH at exactly $100M (outer band gets boundary)', () => {
    const r = computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 100_000_000, toExchange: false });
    expect(r.severity).toBe('HIGH');
  });

  it('MED just below $100M', () => {
    const r = computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 99_000_000, toExchange: false });
    expect(r.severity).toBe('MED');
  });

  it('MED at exactly $10M (outer band gets boundary)', () => {
    const r = computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 10_000_000, toExchange: true });
    expect(r.severity).toBe('MED');
  });

  it('LOW below $10M', () => {
    const r = computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 9_000_000, toExchange: true });
    expect(r.severity).toBe('LOW');
  });

  it('direction Inflow when toExchange=true', () => {
    const r = computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 150_000_000, toExchange: true });
    expect(r.direction).toBe('Inflow');
  });

  it('direction Outflow when toExchange=false', () => {
    const r = computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 150_000_000, toExchange: false });
    expect(r.direction).toBe('Outflow');
  });

  it('description includes asset and amount', () => {
    const r = computeFlowRadar({ type: 'whale_transfer', asset: 'ETH', amountUsd: 200_000_000, toExchange: false });
    expect(r.description).toContain('ETH');
    expect(r.description).toContain('200');
  });
});

describe('computeFlowRadar — exchange_flow', () => {
  it('HIGH at exactly $500M', () => {
    const r = computeFlowRadar({ type: 'exchange_flow', asset: 'BTC', amountUsd: 500_000_000, toExchange: true });
    expect(r.severity).toBe('HIGH');
  });

  it('MED at $100M–$499M', () => {
    const r = computeFlowRadar({ type: 'exchange_flow', asset: 'BTC', amountUsd: 300_000_000, toExchange: true });
    expect(r.severity).toBe('MED');
  });

  it('MED at exactly $100M', () => {
    const r = computeFlowRadar({ type: 'exchange_flow', asset: 'BTC', amountUsd: 100_000_000, toExchange: false });
    expect(r.severity).toBe('MED');
  });

  it('LOW below $100M', () => {
    const r = computeFlowRadar({ type: 'exchange_flow', asset: 'BTC', amountUsd: 50_000_000, toExchange: false });
    expect(r.severity).toBe('LOW');
  });

  it('direction Inflow for toExchange=true', () => {
    const r = computeFlowRadar({ type: 'exchange_flow', asset: 'BTC', amountUsd: 500_000_000, toExchange: true });
    expect(r.direction).toBe('Inflow');
  });

  it('direction Outflow for toExchange=false', () => {
    const r = computeFlowRadar({ type: 'exchange_flow', asset: 'BTC', amountUsd: 500_000_000, toExchange: false });
    expect(r.direction).toBe('Outflow');
  });
});

describe('computeFlowRadar — liq_spike', () => {
  it('HIGH at exactly $200M', () => {
    const r = computeFlowRadar({ type: 'liq_spike', asset: 'BTC', amountUsd: 200_000_000 });
    expect(r.severity).toBe('HIGH');
  });

  it('HIGH above $200M', () => {
    const r = computeFlowRadar({ type: 'liq_spike', asset: 'BTC', amountUsd: 500_000_000 });
    expect(r.severity).toBe('HIGH');
  });

  it('MED at exactly $50M', () => {
    const r = computeFlowRadar({ type: 'liq_spike', asset: 'ETH', amountUsd: 50_000_000 });
    expect(r.severity).toBe('MED');
  });

  it('MED between $50M and $200M', () => {
    const r = computeFlowRadar({ type: 'liq_spike', asset: 'ETH', amountUsd: 100_000_000 });
    expect(r.severity).toBe('MED');
  });

  it('LOW below $50M', () => {
    const r = computeFlowRadar({ type: 'liq_spike', asset: 'ETH', amountUsd: 30_000_000 });
    expect(r.severity).toBe('LOW');
  });

  it('description includes /h suffix', () => {
    const r = computeFlowRadar({ type: 'liq_spike', asset: 'ETH', amountUsd: 200_000_000 });
    expect(r.description).toContain('/h');
  });
});

describe('computeFlowRadar — netflow_flip', () => {
  it('always MED severity', () => {
    const r = computeFlowRadar({ type: 'netflow_flip', asset: 'BTC', amountUsd: 0, flippedPositive: true });
    expect(r.severity).toBe('MED');
  });

  it('Buy Pressure when flippedPositive=true', () => {
    const r = computeFlowRadar({ type: 'netflow_flip', asset: 'BTC', amountUsd: 0, flippedPositive: true });
    expect(r.direction).toBe('Buy Pressure');
  });

  it('Sell Pressure when flippedPositive=false', () => {
    const r = computeFlowRadar({ type: 'netflow_flip', asset: 'BTC', amountUsd: 0, flippedPositive: false });
    expect(r.direction).toBe('Sell Pressure');
  });

  it('description says "sell→buy flip" when flippedPositive=true (flipping TO buy pressure)', () => {
    const r = computeFlowRadar({ type: 'netflow_flip', asset: 'BTC', amountUsd: 0, flippedPositive: true });
    expect(r.description).toContain('sell→buy flip');
  });

  it('description says "buy→sell flip" when flippedPositive=false (flipping TO sell pressure)', () => {
    const r = computeFlowRadar({ type: 'netflow_flip', asset: 'BTC', amountUsd: 0, flippedPositive: false });
    expect(r.description).toContain('buy→sell flip');
  });
});

describe('computeFlowRadar — whale_wall', () => {
  it('MED when > $50M and within 5% of price', () => {
    const r = computeFlowRadar({
      type: 'whale_wall', asset: 'BTC', amountUsd: 60_000_000,
      abovePrice: true, distanceFromPrice: 0.03,
    });
    expect(r.severity).toBe('MED');
  });

  it('LOW when ≤ $50M even within 5%', () => {
    const r = computeFlowRadar({
      type: 'whale_wall', asset: 'BTC', amountUsd: 50_000_000,
      abovePrice: false, distanceFromPrice: 0.02,
    });
    expect(r.severity).toBe('LOW');
  });

  it('LOW when > $50M but outside 5%', () => {
    const r = computeFlowRadar({
      type: 'whale_wall', asset: 'BTC', amountUsd: 60_000_000,
      abovePrice: true, distanceFromPrice: 0.06,
    });
    expect(r.severity).toBe('LOW');
  });

  it('Resistance Wall when abovePrice=true', () => {
    const r = computeFlowRadar({
      type: 'whale_wall', asset: 'BTC', amountUsd: 60_000_000,
      abovePrice: true, distanceFromPrice: 0.03,
    });
    expect(r.direction).toBe('Resistance Wall');
  });

  it('Support Wall when abovePrice=false', () => {
    const r = computeFlowRadar({
      type: 'whale_wall', asset: 'BTC', amountUsd: 60_000_000,
      abovePrice: false, distanceFromPrice: 0.03,
    });
    expect(r.direction).toBe('Support Wall');
  });

  it('MED at exactly 5% distance (boundary inclusive)', () => {
    const r = computeFlowRadar({
      type: 'whale_wall', asset: 'BTC', amountUsd: 60_000_000,
      abovePrice: true, distanceFromPrice: 0.05,
    });
    expect(r.severity).toBe('MED');
  });
});

describe('computeFlowRadar — smart_money', () => {
  it('HIGH when confidence > 0.8', () => {
    const r = computeFlowRadar({
      type: 'smart_money', asset: 'BTC', amountUsd: 50_000_000, isLong: true, confidence: 0.9,
    });
    expect(r.severity).toBe('HIGH');
  });

  it('MED when confidence = 0.8 (not strictly > 0.8)', () => {
    const r = computeFlowRadar({
      type: 'smart_money', asset: 'BTC', amountUsd: 50_000_000, isLong: true, confidence: 0.8,
    });
    expect(r.severity).toBe('MED');
  });

  it('MED when no confidence provided', () => {
    const r = computeFlowRadar({
      type: 'smart_money', asset: 'BTC', amountUsd: 50_000_000, isLong: false,
    });
    expect(r.severity).toBe('MED');
  });

  it('Smart Money direction when isLong=true', () => {
    const r = computeFlowRadar({
      type: 'smart_money', asset: 'SOL', amountUsd: 20_000_000, isLong: true,
    });
    expect(r.direction).toBe('Smart Money');
  });

  it('Accumulation direction when isLong=false', () => {
    const r = computeFlowRadar({
      type: 'smart_money', asset: 'SOL', amountUsd: 20_000_000, isLong: false,
    });
    expect(r.direction).toBe('Accumulation');
  });
});
