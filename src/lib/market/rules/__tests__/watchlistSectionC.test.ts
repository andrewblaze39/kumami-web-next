import { describe, it, expect } from 'vitest';
import { computeSectionC, computeWhaleEventCounts } from '../watchlistSectionC';
import type { FlowEvent } from '../../contracts';

let counter = 0;
const ev = (
  asset: string,
  type: FlowEvent['type'],
  direction: FlowEvent['direction'],
  amountUsd: number,
  severity: FlowEvent['severity'] = 'MED',
  ts: string = new Date().toISOString(),
): FlowEvent => ({
  id: `e${counter++}`,
  type,
  asset,
  amountUsd,
  direction,
  severity,
  description: 'test',
  ts,
});

describe('computeWhaleEventCounts', () => {
  it('counts bullish (Outflow) and bearish (Inflow) whale transfers per asset', () => {
    const counts = computeWhaleEventCounts([
      ev('BTC', 'whale_transfer', 'Outflow', 10_000_000),
      ev('BTC', 'whale_transfer', 'Outflow', 20_000_000),
      ev('BTC', 'whale_transfer', 'Inflow', 5_000_000),
      ev('ETH', 'whale_transfer', 'Inflow', 5_000_000),
    ]);
    expect(counts.BTC).toEqual({ bullish: 2, bearish: 1 });
    expect(counts.ETH).toEqual({ bullish: 0, bearish: 1 });
  });

  it('ignores non-whale-transfer event types', () => {
    const counts = computeWhaleEventCounts([ev('BTC', 'liq_spike', 'Sell Pressure', 10_000_000)]);
    expect(counts.BTC).toBeUndefined();
  });
});

describe('computeSectionC', () => {
  it('excludes assets in the exclude set (Section A + B)', () => {
    const events = [ev('BTC', 'whale_transfer', 'Outflow', 60_000_000)];
    const result = computeSectionC(events, new Set(['BTC']));
    expect(result).toEqual([]);
  });

  it('scores Sustained Accumulation when net outflow > $50M', () => {
    const events = [ev('PENDLE', 'whale_transfer', 'Outflow', 60_000_000)];
    const result = computeSectionC(events, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].asset).toBe('PENDLE');
    expect(result[0].reasons).toContain('Sustained accumulation');
  });

  it('does not score below the $50M outflow threshold alone', () => {
    const events = [ev('PENDLE', 'whale_transfer', 'Outflow', 10_000_000)];
    const result = computeSectionC(events, new Set());
    expect(result).toEqual([]);
  });

  it('scores Multi-Event Bullish Flow with 3+ bullish events incl. 1 HIGH', () => {
    const events = [
      ev('ARB', 'whale_transfer', 'Outflow', 1_000_000, 'HIGH'),
      ev('ARB', 'whale_transfer', 'Outflow', 1_000_000, 'MED'),
      ev('ARB', 'whale_transfer', 'Outflow', 1_000_000, 'MED'),
    ];
    const result = computeSectionC(events, new Set());
    expect(result[0].reasons).toContain('Multi-signal bullish flow');
  });

  it('does not score Multi-Event Bullish Flow without a HIGH severity event', () => {
    const events = [
      ev('ARB', 'whale_transfer', 'Outflow', 1_000_000, 'MED'),
      ev('ARB', 'whale_transfer', 'Outflow', 1_000_000, 'MED'),
      ev('ARB', 'whale_transfer', 'Outflow', 1_000_000, 'MED'),
    ];
    const result = computeSectionC(events, new Set());
    expect(result).toEqual([]);
  });

  it('scores Coordinated Smart Money with 2+ same-direction smart_money events', () => {
    const events = [
      ev('SUI', 'smart_money', 'Smart Money', 5_000_000),
      ev('SUI', 'smart_money', 'Smart Money', 5_000_000),
    ];
    const result = computeSectionC(events, new Set());
    expect(result[0].reasons).toContain('Coordinated smart money');
  });

  it('applies the multi-criteria multiplier when 2+ criteria fire', () => {
    const singleCriterion = computeSectionC(
      [ev('A', 'whale_transfer', 'Outflow', 60_000_000)],
      new Set(),
    )[0].score;
    const twoCriteria = computeSectionC(
      [
        ev('B', 'whale_transfer', 'Outflow', 60_000_000),
        ev('B', 'smart_money', 'Smart Money', 1_000_000),
        ev('B', 'smart_money', 'Smart Money', 1_000_000),
      ],
      new Set(),
    )[0].score;
    // single: 3; two criteria (3+4=7) * (2*0.5+1=2) = 14 > 3
    expect(twoCriteria).toBeGreaterThan(singleCriterion);
  });

  it('sorts descending by score and caps at top 5', () => {
    const events: FlowEvent[] = [];
    const assets = ['A', 'B', 'C', 'D', 'E', 'F'];
    assets.forEach((a, i) => {
      // Give each a different outflow amount so scores differ (multiplier via HIGH severity below).
      events.push(ev(a, 'whale_transfer', 'Outflow', 60_000_000 + i * 1_000_000, i % 2 === 0 ? 'HIGH' : 'MED'));
    });
    const result = computeSectionC(events, new Set());
    expect(result.length).toBe(5);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });
});
