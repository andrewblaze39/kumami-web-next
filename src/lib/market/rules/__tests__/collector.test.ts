import { describe, it, expect } from 'vitest';
import { eventKey, foldEvent, hourlyDeltas, hourOf } from '../collector';
import { waitBeforeNextCall } from '../../coinglass/rateWindow';
import { secretMatches } from '../../../api/cronSecret';
import type { FlowEvent } from '../../contracts';

const M = 1_000_000;
const ev = (over: Partial<FlowEvent>): FlowEvent => ({
  id: 'x', type: 'whale_transfer', asset: 'BTC', amountUsd: 20 * M, direction: 'Outflow', severity: 'MED',
  description: '', ts: '2026-10-21T03:15:00.000Z', ...over,
});

describe('collector — folding repeat sightings', () => {
  it('a new event is stored and counted once', () => {
    expect(foldEvent(undefined, ev({}))).toEqual({ amountUsd: 20 * M, addToHourly: 20 * M, counted: 20 * M });
  });
  it('the same event again adds nothing (unique key)', () => {
    expect(foldEvent({ amountUsd: 20 * M, direction: 'Outflow', counted: 20 * M }, ev({}))).toMatchObject({ addToHourly: 0 });
  });
  it('liquidations keep the peak and add only the increase', () => {
    const prev = { amountUsd: 60 * M, direction: 'Long Flush' as const, counted: 60 * M };
    expect(foldEvent(prev, ev({ type: 'liq_spike', direction: 'Long Flush', amountUsd: 90 * M }))).toEqual({ amountUsd: 90 * M, addToHourly: 30 * M, counted: 90 * M });
    expect(foldEvent(prev, ev({ type: 'liq_spike', direction: 'Long Flush', amountUsd: 40 * M }))).toMatchObject({ amountUsd: 60 * M, addToHourly: 0 });
  });
  it('Dry Powder keeps the latest net and never counts toward a coin', () => {
    const r = foldEvent({ amountUsd: 80 * M, direction: 'Dry Powder In' }, ev({ type: 'exchange_flow', asset: 'USDT', direction: 'Dry Powder In', amountUsd: 30 * M, marketWide: true }));
    expect(r).toEqual({ amountUsd: 30 * M, addToHourly: 0, counted: 0 });
  });
  it('neutral events are stored but never counted', () => {
    expect(foldEvent(undefined, ev({ type: 'smart_money', direction: 'Position Closed' })).addToHourly).toBe(0);
  });
});

describe('collector — hourly buckets', () => {
  it('sums bullish / bearish $ per coin per hour', () => {
    const out = hourlyDeltas([
      { e: ev({ direction: 'Outflow', amountUsd: 20 * M }), add: 20 * M },
      { e: ev({ id: 'b', direction: 'Inflow' }), add: 5 * M },
      { e: ev({ id: 'c', asset: 'ETH', ts: '2026-10-21T04:00:00Z' }), add: 7 * M },
      { e: ev({ id: 'd', direction: 'Position Closed', type: 'smart_money' }), add: 9 * M },
      { e: ev({ id: 'e', direction: 'Dry Powder In', marketWide: true, asset: 'USDT' }), add: 9 * M },
    ]);
    expect(out).toEqual([
      { key: '2026-10-21T03_BTC', hour: '2026-10-21T03', asset: 'BTC', bullishUsd: 20 * M, bearishUsd: 5 * M },
      { key: '2026-10-21T04_ETH', hour: '2026-10-21T04', asset: 'ETH', bullishUsd: 7 * M, bearishUsd: 0 },
    ]);
  });
  it('hour keys and safe document ids', () => {
    expect(hourOf('2026-10-21T03:59:59Z')).toBe('2026-10-21T03');
    expect(eventKey('drypowder-Crypto.com/x-USDT-2026')).toBe('drypowder-Crypto.com_x-USDT-2026');
  });
});

describe('shared CoinGlass budget (70/min)', () => {
  it('no wait under the limit, waits for the oldest call to leave the window at the limit', () => {
    const now = 100_000;
    expect(waitBeforeNextCall(Array(69).fill(now - 1000), now)).toBe(0);
    const calls = [now - 50_000, ...Array(69).fill(now - 1000)];
    expect(waitBeforeNextCall(calls, now)).toBe(10_000);
    expect(waitBeforeNextCall([now - 61_000, ...Array(69).fill(now)], now)).toBe(0);
  });
});

describe('cron secret', () => {
  it('constant-time match; empty never matches', () => {
    expect(secretMatches('abc', 'abc')).toBe(true);
    expect(secretMatches('abd', 'abc')).toBe(false);
    expect(secretMatches('ab', 'abc')).toBe(false);
    expect(secretMatches(null, 'abc')).toBe(false);
    expect(secretMatches('', '')).toBe(false);
  });
});
