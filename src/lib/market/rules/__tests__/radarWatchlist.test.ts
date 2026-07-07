import { describe, it, expect } from 'vitest';
import { computeRadarWatchlist, type WatchlistEvent } from '../radarWatchlist';

// Doc lines 161–174.
// Filter to bullish directions: Outflow, Accumulation, Smart Money.
// Score: HIGH=3, MED=1. Recency ×1.5 if < 6h old (vs now).
// Top 4 by score.

const NOW = 1_000_000_000_000; // fixed timestamp for tests (ms)
const AGO_1H  = NOW - 1 * 60 * 60 * 1000;   // 1h ago — within 6h → recency applies
const AGO_5H  = NOW - 5 * 60 * 60 * 1000;   // 5h ago — within 6h → recency applies
const AGO_6H  = NOW - 6 * 60 * 60 * 1000;   // exactly 6h ago → NO recency (strictly <6h)
const AGO_7H  = NOW - 7 * 60 * 60 * 1000;   // 7h ago — no recency
const AGO_20H = NOW - 20 * 60 * 60 * 1000;  // 20h ago — within 24h window, no recency

function makeEvent(
  asset: string,
  direction: WatchlistEvent['direction'],
  severity: WatchlistEvent['severity'],
  ts: number,
  type: WatchlistEvent['type'] = 'whale_transfer',
): WatchlistEvent {
  return { type, asset, direction, severity, ts: new Date(ts).toISOString() };
}

describe('computeRadarWatchlist — bullish direction filter', () => {
  it('includes Outflow events', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Outflow', 'HIGH', AGO_1H)],
      now: NOW,
    });
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].asset).toBe('BTC');
  });

  it('includes Accumulation events', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('ETH', 'Accumulation', 'MED', AGO_1H)],
      now: NOW,
    });
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].asset).toBe('ETH');
  });

  it('includes Smart Money events', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('SOL', 'Smart Money', 'HIGH', AGO_1H)],
      now: NOW,
    });
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].asset).toBe('SOL');
  });

  it('excludes Inflow events (bearish)', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Inflow', 'HIGH', AGO_1H)],
      now: NOW,
    });
    expect(r.entries).toHaveLength(0);
  });

  it('excludes Sell Pressure events', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Sell Pressure', 'HIGH', AGO_1H)],
      now: NOW,
    });
    expect(r.entries).toHaveLength(0);
  });

  it('excludes Buy Pressure events (not in bullish list)', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Buy Pressure', 'HIGH', AGO_1H)],
      now: NOW,
    });
    expect(r.entries).toHaveLength(0);
  });
});

describe('computeRadarWatchlist — scoring', () => {
  it('HIGH event without recency scores 3', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Outflow', 'HIGH', AGO_7H)],
      now: NOW,
    });
    expect(r.entries[0].score).toBe(3);
  });

  it('MED event without recency scores 1', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Outflow', 'MED', AGO_7H)],
      now: NOW,
    });
    expect(r.entries[0].score).toBe(1);
  });

  it('HIGH event within 6h gets ×1.5 = 4.5', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Outflow', 'HIGH', AGO_1H)],
      now: NOW,
    });
    expect(r.entries[0].score).toBe(4.5);
  });

  it('MED event within 6h gets ×1.5 = 1.5', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Outflow', 'MED', AGO_5H)],
      now: NOW,
    });
    expect(r.entries[0].score).toBe(1.5);
  });

  it('event exactly 6h old does NOT get recency multiplier (strictly < 6h)', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Outflow', 'HIGH', AGO_6H)],
      now: NOW,
    });
    expect(r.entries[0].score).toBe(3); // no recency
  });

  it('event 5h59m old gets recency multiplier', () => {
    const JUST_UNDER_6H = NOW - (6 * 60 * 60 * 1000 - 60_000);
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Outflow', 'HIGH', JUST_UNDER_6H)],
      now: NOW,
    });
    expect(r.entries[0].score).toBe(4.5);
  });

  it('multiple events for same asset sum their scores', () => {
    const r = computeRadarWatchlist({
      events: [
        makeEvent('BTC', 'Outflow', 'HIGH', AGO_7H),  // +3
        makeEvent('BTC', 'Outflow', 'MED',  AGO_20H), // +1
      ],
      now: NOW,
    });
    expect(r.entries[0].asset).toBe('BTC');
    expect(r.entries[0].score).toBe(4);
  });
});

describe('computeRadarWatchlist — ranking', () => {
  it('returns at most 4 entries', () => {
    const events = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'DOGE'].map(a =>
      makeEvent(a, 'Outflow', 'HIGH', AGO_7H),
    );
    const r = computeRadarWatchlist({ events, now: NOW });
    expect(r.entries).toHaveLength(4);
  });

  it('returns fewer than 4 when fewer bullish assets exist', () => {
    const r = computeRadarWatchlist({
      events: [
        makeEvent('BTC', 'Outflow', 'HIGH', AGO_1H),
        makeEvent('ETH', 'Accumulation', 'MED', AGO_7H),
      ],
      now: NOW,
    });
    expect(r.entries).toHaveLength(2);
  });

  it('ranks by score descending', () => {
    const r = computeRadarWatchlist({
      events: [
        makeEvent('LOW_ASSET', 'Outflow', 'MED', AGO_7H),  // score 1
        makeEvent('HIGH_ASSET', 'Outflow', 'HIGH', AGO_7H), // score 3
      ],
      now: NOW,
    });
    expect(r.entries[0].asset).toBe('HIGH_ASSET');
    expect(r.entries[1].asset).toBe('LOW_ASSET');
  });

  it('returns empty when no bullish events', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Inflow', 'HIGH', AGO_1H)],
      now: NOW,
    });
    expect(r.entries).toHaveLength(0);
  });
});

describe('computeRadarWatchlist — signal labels', () => {
  it('Smart Money → "Smart Money Long"', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('BTC', 'Smart Money', 'HIGH', AGO_1H)],
      now: NOW,
    });
    expect(r.entries[0].signal).toBe('Smart Money Long');
  });

  it('Accumulation → "Whale Accumulation"', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('ETH', 'Accumulation', 'MED', AGO_1H)],
      now: NOW,
    });
    expect(r.entries[0].signal).toBe('Whale Accumulation');
  });

  it('Outflow from whale_transfer → "Whale Outflow"', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('SOL', 'Outflow', 'HIGH', AGO_1H, 'whale_transfer')],
      now: NOW,
    });
    expect(r.entries[0].signal).toBe('Whale Outflow');
  });

  it('Outflow from exchange_flow → "Exchange Outflow"', () => {
    const r = computeRadarWatchlist({
      events: [makeEvent('SOL', 'Outflow', 'HIGH', AGO_1H, 'exchange_flow')],
      now: NOW,
    });
    expect(r.entries[0].signal).toBe('Exchange Outflow');
  });
});
