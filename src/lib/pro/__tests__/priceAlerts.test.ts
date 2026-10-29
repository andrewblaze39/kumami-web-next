import { describe, it, expect } from 'vitest';
import {
  evaluateAlert, alertLabel, normalizeAlerts, fromLegacyAlert, tickersFromBinance, ALERT_KINDS, MAX_ALERTS,
  type AlertDef, type AlertState, type Ticker,
} from '../priceAlerts';

// v1.18 point 5 (Andrew, 29 Oct 2026): Following & Alerts works like CoinMarketCap's alerts.
const T = (o: Partial<Ticker> = {}): Ticker => ({ price: 100, change24hPct: 0, quoteVolume24h: 1_000_000, ...o });
const def = (o: Partial<AlertDef>): AlertDef => ({ id: 1, symbol: 'BTC', kind: 'price_above', value: 110, frequency: 'once', on: true, ...o });
const NOW = Date.UTC(2026, 9, 29, 12);

describe('evaluateAlert', () => {
  it('price rises above: fires on crossing, once → pauses', () => {
    const r1 = evaluateAlert(def({}), undefined, T({ price: 105 }), NOW);
    expect(r1.trigger).toBeNull();
    const r2 = evaluateAlert(def({}), r1.state, T({ price: 111 }), NOW + 60_000);
    expect(r2.trigger?.message).toBe('BTC rose above $110 — now $111');
    expect(r2.pause).toBe(true);
    expect(r2.state.lastTriggeredAt).toBe(NOW + 60_000);
  });

  it('does not fire straight away when the condition is already true at creation (arms only once it is false)', () => {
    const r = evaluateAlert(def({}), undefined, T({ price: 120 }), NOW);
    expect(r.trigger).toBeNull();
    expect(r.state.armed).toBe(false);
  });

  it('every time: fires, re-arms after the condition clears, fires again', () => {
    const d = def({ kind: 'price_below', value: 90, frequency: 'every' });
    let s = evaluateAlert(d, undefined, T({ price: 95 }), NOW).state;
    const a = evaluateAlert(d, s, T({ price: 89 }), NOW + 1);
    expect(a.trigger?.message).toBe('BTC dropped below $90 — now $89');
    expect(a.pause).toBe(false);
    s = evaluateAlert(d, a.state, T({ price: 88 }), NOW + 2).state; // still below: no repeat
    expect(evaluateAlert(d, s, T({ price: 88 }), NOW + 3).trigger).toBeNull();
    s = evaluateAlert(d, s, T({ price: 92 }), NOW + 4).state; // back above: re-armed
    expect(evaluateAlert(d, s, T({ price: 89.5 }), NOW + 5).trigger).not.toBeNull();
  });

  it('24h % change up / down', () => {
    const up = def({ kind: 'pct_up_24h', value: 5 });
    const s = evaluateAlert(up, undefined, T({ change24hPct: 2 }), NOW).state;
    expect(evaluateAlert(up, s, T({ change24hPct: 6.2, price: 106 }), NOW + 1).trigger?.message).toBe('BTC is up 6.2% in 24h — now $106');
    const down = def({ kind: 'pct_down_24h', value: 5 });
    const s2 = evaluateAlert(down, undefined, T({ change24hPct: -1 }), NOW).state;
    expect(evaluateAlert(down, s2, T({ change24hPct: -7 }), NOW + 1).trigger?.message).toBe('BTC is down 7.0% in 24h — now $100');
  });

  it('24h volume up X% against the volume when the alert was armed', () => {
    const v = def({ kind: 'volume_up', value: 50 });
    const s = evaluateAlert(v, undefined, T({ quoteVolume24h: 1_000_000 }), NOW).state;
    expect(s.baseline).toBe(1_000_000);
    expect(evaluateAlert(v, s, T({ quoteVolume24h: 1_400_000 }), NOW + 1).trigger).toBeNull();
    expect(evaluateAlert(v, s, T({ quoteVolume24h: 1_600_000 }), NOW + 1).trigger?.message).toBe('BTC 24h volume is up 60% — $1.6M');
  });

  it('legacy "price changes by X%": a move either way from the price it armed at', () => {
    const m = def({ kind: 'move_pct', value: 5 });
    const s = evaluateAlert(m, undefined, T({ price: 100 }), NOW).state;
    expect(s.baseline).toBe(100);
    expect(evaluateAlert(m, s, T({ price: 94 }), NOW + 1).trigger?.message).toBe('BTC moved -6.0% since the alert armed — now $94');
  });

  it('a paused alert or a missing price never fires and keeps its state', () => {
    const s: AlertState = { armed: true };
    expect(evaluateAlert(def({ on: false }), s, T({ price: 200 }), NOW).trigger).toBeNull();
    expect(evaluateAlert(def({}), s, null, NOW).trigger).toBeNull();
    expect(evaluateAlert(def({}), s, null, NOW).state).toBe(s);
  });
});

describe('alertLabel', () => {
  it('reads like CMC', () => {
    expect(alertLabel(def({}))).toBe('BTC price rises above $110');
    expect(alertLabel(def({ kind: 'price_below', value: 0.25, symbol: 'DOGE' }))).toBe('DOGE price drops below $0.25');
    expect(alertLabel(def({ kind: 'pct_up_24h', value: 5 }))).toBe('BTC up 5% in 24h');
    expect(alertLabel(def({ kind: 'pct_down_24h', value: 5 }))).toBe('BTC down 5% in 24h');
    expect(alertLabel(def({ kind: 'volume_up', value: 50 }))).toBe('BTC 24h volume up 50%');
    expect(alertLabel(def({ kind: 'move_pct', value: 5 }))).toBe('BTC moves 5% either way');
  });
});

describe('normalizeAlerts (what the API accepts)', () => {
  it('keeps valid alerts, upper-cases symbols, drops invalid ones', () => {
    const out = normalizeAlerts([
      { id: 1, symbol: 'btc', kind: 'price_above', value: 110, frequency: 'once', on: true },
      { id: 2, symbol: 'ETH', kind: 'nope', value: 5, frequency: 'once', on: true },
      { id: 3, symbol: 'SOL', kind: 'pct_up_24h', value: -5, frequency: 'once', on: true },
      { id: 4, symbol: '<script>', kind: 'price_above', value: 1, frequency: 'once', on: true },
      { id: 5, symbol: 'BNB', kind: 'pct_down_24h', value: 3, frequency: 'weird', on: 'yes' },
    ]);
    expect(out.map((a) => a.id)).toEqual([1, 5]);
    expect(out[0].symbol).toBe('BTC');
    expect(out[1]).toMatchObject({ frequency: 'once', on: true });
  });

  it('caps the number of alerts', () => {
    const many = Array.from({ length: MAX_ALERTS + 5 }, (_, i) => ({ id: i + 1, symbol: 'BTC', kind: 'price_above', value: 100 + i, frequency: 'once', on: true }));
    expect(normalizeAlerts(many)).toHaveLength(MAX_ALERTS);
  });

  it('lists the CMC-style kinds', () => {
    expect(ALERT_KINDS.map((k) => k.kind)).toEqual(['price_above', 'price_below', 'pct_up_24h', 'pct_down_24h', 'volume_up']);
  });
});

describe('fromLegacyAlert (alerts saved before v1.18)', () => {
  it('maps price and volume alerts; sentiment alerts are not supported any more', () => {
    expect(fromLegacyAlert({ id: 7, label: 'BTC price changes by 5%', on: true, subject: 'BTC', trigger: 'price', threshold: 5 }))
      .toEqual({ id: 7, symbol: 'BTC', kind: 'move_pct', value: 5, frequency: 'every', on: true });
    expect(fromLegacyAlert({ id: 8, label: 'ETH volume spikes by 20%', on: false, subject: 'ETH', trigger: 'volume', threshold: 20 }))
      .toEqual({ id: 8, symbol: 'ETH', kind: 'volume_up', value: 20, frequency: 'every', on: false });
    expect(fromLegacyAlert({ id: 9, label: 'BTC news sentiment flips', on: true, subject: 'BTC', trigger: 'sentiment' })).toBeNull();
    expect(fromLegacyAlert({ id: 10, label: 'SOL price changes by 3%', on: true })).toMatchObject({ symbol: 'SOL', kind: 'move_pct', value: 3 });
  });
});

describe('tickersFromBinance (MINI 24h rows → Ticker per base coin)', () => {
  it('USDT pairs only, change from the 24h open, drops bad rows', () => {
    const t = tickersFromBinance([
      { symbol: 'BTCUSDT', openPrice: '100', lastPrice: '105', quoteVolume: '2000000' },
      { symbol: 'ETHBTC', openPrice: '0.03', lastPrice: '0.031', quoteVolume: '10' },
      { symbol: 'XYZUSDT', openPrice: '0', lastPrice: '1', quoteVolume: '5' },
      { symbol: 'SOLUSDT', openPrice: '200', lastPrice: 'nope', quoteVolume: '1' },
    ]);
    expect(Object.keys(t)).toEqual(['BTC']);
    expect(t.BTC).toEqual({ price: 105, change24hPct: 5, quoteVolume24h: 2_000_000 });
  });
});
