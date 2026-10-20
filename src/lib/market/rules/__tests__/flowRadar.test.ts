import { describe, it, expect } from 'vitest';
import { computeFlowRadar, smartMoneySeverity } from '../flowRadar';

// Rachelle v1.15 Plus §3 — events, directions and severity tiers.
const M = 1_000_000;

describe('whale_transfer', () => {
  it('deposit = Inflow, withdrawal = Outflow', () => {
    expect(computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 20 * M, toExchange: true })?.direction).toBe('Inflow');
    expect(computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 20 * M, toExchange: false })?.direction).toBe('Outflow');
  });
  it('HIGH ≥ $100M, MED $10–100M, nothing below $10M', () => {
    expect(computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 100 * M, toExchange: true })?.severity).toBe('HIGH');
    expect(computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 99 * M, toExchange: true })?.severity).toBe('MED');
    expect(computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 10 * M, toExchange: true })?.severity).toBe('MED');
    expect(computeFlowRadar({ type: 'whale_transfer', asset: 'BTC', amountUsd: 9.9 * M, toExchange: true })).toBeNull();
  });
});

describe('exchange_flow (Dry Powder)', () => {
  it('stablecoins onto exchanges = Dry Powder In (bullish), off = Dry Powder Out', () => {
    expect(computeFlowRadar({ type: 'exchange_flow', asset: 'USDT', amountUsd: 30 * M, netIntoExchanges: true, exchange: 'Binance' })?.direction).toBe('Dry Powder In');
    expect(computeFlowRadar({ type: 'exchange_flow', asset: 'USDT', amountUsd: 30 * M, netIntoExchanges: false })?.direction).toBe('Dry Powder Out');
  });
  it('HIGH ≥ $500M, MED $100–500M, LOW $25–100M, nothing below $25M', () => {
    const sev = (usd: number) => computeFlowRadar({ type: 'exchange_flow', asset: 'USDC', amountUsd: usd, netIntoExchanges: true })?.severity ?? null;
    expect(sev(500 * M)).toBe('HIGH');
    expect(sev(100 * M)).toBe('MED');
    expect(sev(25 * M)).toBe('LOW');
    expect(sev(24 * M)).toBeNull();
  });
  it('names the exchange', () => {
    expect(computeFlowRadar({ type: 'exchange_flow', asset: 'USDT', amountUsd: 30 * M, netIntoExchanges: true, exchange: 'Binance' })?.description)
      .toMatch(/USDT onto Binance/);
  });
});

describe('liq_spike', () => {
  const liq = (usd: number, longShare: number) => computeFlowRadar({ type: 'liq_spike', asset: 'ETH', amountUsd: usd, longShare });
  it('> 70% longs = Long Flush, < 30% = Short Squeeze, else Two-sided Flush', () => {
    expect(liq(60 * M, 0.71)?.direction).toBe('Long Flush');
    expect(liq(60 * M, 0.29)?.direction).toBe('Short Squeeze');
    expect(liq(60 * M, 0.7)?.direction).toBe('Two-sided Flush');
    expect(liq(60 * M, 0.3)?.direction).toBe('Two-sided Flush');
  });
  it('HIGH ≥ $200M/h, MED $50–200M, LOW $10–50M, nothing below $10M', () => {
    expect(liq(200 * M, 0.9)?.severity).toBe('HIGH');
    expect(liq(50 * M, 0.9)?.severity).toBe('MED');
    expect(liq(10 * M, 0.9)?.severity).toBe('LOW');
    expect(liq(9 * M, 0.9)).toBeNull();
  });
  it('never labels a squeeze "Sell Pressure" any more', () => {
    expect(liq(80 * M, 0.1)?.direction).not.toBe('Sell Pressure');
  });
});

describe('smart_money', () => {
  it('opened long = bullish label, opened short = bearish label, closed = neutral', () => {
    expect(computeFlowRadar({ type: 'smart_money', asset: 'BTC', amountUsd: 30 * M, isLong: true })?.direction).toBe('Long Opened');
    expect(computeFlowRadar({ type: 'smart_money', asset: 'BTC', amountUsd: 30 * M, isLong: false })?.direction).toBe('Short Opened');
    expect(computeFlowRadar({ type: 'smart_money', asset: 'BTC', amountUsd: 30 * M, isLong: false, closed: true })?.direction).toBe('Position Closed');
  });
  it('size tiers differ for BTC/ETH and other coins', () => {
    expect(smartMoneySeverity('BTC', 25 * M)).toBe('HIGH');
    expect(smartMoneySeverity('BTC', 24 * M)).toBe('MED');
    expect(smartMoneySeverity('ETH', 5 * M)).toBe('MED');
    expect(smartMoneySeverity('ETH', 4.9 * M)).toBe('LOW');
    expect(smartMoneySeverity('SOL', 10 * M)).toBe('HIGH');
    expect(smartMoneySeverity('SOL', 2 * M)).toBe('MED');
    expect(smartMoneySeverity('SOL', 1.9 * M)).toBe('LOW');
    expect(smartMoneySeverity('SOL', 1 * M)).toBe('LOW');
    expect(smartMoneySeverity('SOL', 0.9 * M)).toBeNull();
  });
  it('HIGH at $100M for any coin', () => {
    expect(smartMoneySeverity('PEPE', 100 * M)).toBe('HIGH');
  });
});

describe('netflow_flip and whale_wall (unchanged)', () => {
  it('netflow flip is always MED, Buy/Sell Pressure', () => {
    expect(computeFlowRadar({ type: 'netflow_flip', asset: 'SOL', amountUsd: 1, flippedPositive: true })).toMatchObject({ severity: 'MED', direction: 'Buy Pressure' });
    expect(computeFlowRadar({ type: 'netflow_flip', asset: 'SOL', amountUsd: 1, flippedPositive: false })?.direction).toBe('Sell Pressure');
  });
  it('whale wall MED only above $50M within 5% of price', () => {
    expect(computeFlowRadar({ type: 'whale_wall', asset: 'BTC', amountUsd: 60 * M, abovePrice: true, distanceFromPrice: 0.04 })).toMatchObject({ severity: 'MED', direction: 'Resistance Wall' });
    expect(computeFlowRadar({ type: 'whale_wall', asset: 'BTC', amountUsd: 60 * M, abovePrice: false, distanceFromPrice: 0.06 })).toMatchObject({ severity: 'LOW', direction: 'Support Wall' });
  });
});
