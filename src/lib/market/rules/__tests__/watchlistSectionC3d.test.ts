import { describe, it, expect } from 'vitest';
import { computeSectionC3d, dayNet } from '../watchlistSectionC3d';
import { checkPin, type PinMarkets } from '../watchlistPins';
import type { FlowDailyDoc, FlowDayTally } from '../consistentFlow';

// Rachelle v1.15 Pro §19 — Section B pin rules + Section C 3-day accumulation.
const M = 1_000_000;
const markets: PinMarkets = {
  spotVolume: new Map([['LINK', 80 * M], ['XRP', 400 * M], ['ZEC', 20 * M], ['THIN', 4 * M], ['NOFUT', 50 * M], ['AKE', 12 * M]]),
  futures: new Set(['LINK', 'XRP', 'ZEC', 'THIN', 'AKE']),
};

describe('checkPin (Section B)', () => {
  it('accepts liquid coins with a futures market', () => {
    expect(checkPin('link', markets)).toEqual({ ok: true });
  });
  it('rejects core assets, stablecoins and wrapped tokens', () => {
    expect(checkPin('BTC', markets)).toMatchObject({ ok: false, code: 'core_asset' });
    expect(checkPin('USDC', markets)).toMatchObject({ ok: false, code: 'not_allowed' });
    expect(checkPin('WBTC', markets)).toMatchObject({ ok: false, code: 'not_allowed' });
  });
  it('rejects under $10M spot volume or no futures market with the spec message', () => {
    expect(checkPin('THIN', markets)).toEqual({ ok: false, code: 'illiquid', message: 'Not enough liquidity to track reliably.' });
    expect(checkPin('NOFUT', markets)).toMatchObject({ ok: false, code: 'illiquid' });
    expect(checkPin('UNKNOWN', markets)).toMatchObject({ ok: false, code: 'illiquid' });
  });
  it('rejects junk input', () => {
    expect(checkPin('<script>', markets)).toMatchObject({ ok: false, code: 'invalid_symbol' });
  });
});

const t = (bullishUsd: number, bearishUsd: number): FlowDayTally => ({
  maxEvents: 2, maxUsd: bullishUsd + bearishUsd, high: 0, bullish: bullishUsd > 0 ? 1 : 0, bearish: bearishUsd > 0 ? 1 : 0, bullishUsd, bearishUsd,
});
const day = (date: string, assets: Record<string, FlowDayTally>): FlowDailyDoc => ({ date, assets });

describe('computeSectionC3d (Section C)', () => {
  const spotNet3d = new Map([['LINK', 18 * M], ['XRP', 5 * M], ['ZEC', -2 * M], ['AKE', 3 * M]]);
  const opts = { exclude: new Set<string>(), markets, spotNet3d };

  it('qualifies a coin bought on 3 of 3 days, confirmed by spot buyers; hover text', () => {
    const r = computeSectionC3d([
      day('2026-10-18', { LINK: t(20 * M, 5 * M) }),
      day('2026-10-19', { LINK: t(15 * M, 2 * M) }),
      day('2026-10-20', { LINK: t(15 * M, 1 * M) }),
    ], opts);
    expect(r.mode).toBe('consistent');
    expect(r.coins.map((c) => c.asset)).toEqual(['LINK']);
    expect(r.coins[0].reasons).toEqual(['Accumulating 3 of 3 days', 'net flow +$42M · spot buyers +$18M (3d)']);
  });

  it('small spot flows read in $K / one decimal, never "$0M"', () => {
    const r = computeSectionC3d([
      day('2026-10-18', { LINK: t(4 * M, 0) }), day('2026-10-19', { LINK: t(4 * M, 0) }), day('2026-10-20', { LINK: t(0, 0) }),
    ], { ...opts, spotNet3d: new Map([['LINK', 340_000]]) });
    expect(r.coins[0].reasons[1]).toBe('net flow +$8.0M · spot buyers +$340K (3d)');
  });

  it('a coin sold every day never qualifies (the v1.14 7-day rule ranked these first)', () => {
    const r = computeSectionC3d([
      day('2026-10-18', { XRP: t(1 * M, 30 * M) }),
      day('2026-10-19', { XRP: t(1 * M, 30 * M) }),
      day('2026-10-20', { XRP: t(1 * M, 30 * M) }),
    ], opts);
    expect(r.coins).toEqual([]);
  });

  it('each rule: ≥ 2 buying days, > +$5M, last 24h undo ≤ 25%, spot buyers > 0, liquidity', () => {
    const days = (a: string, x: FlowDayTally[]) => x.map((v, i) => day(`2026-10-${18 + i}`, { [a]: v }));
    // only 1 buying day
    expect(computeSectionC3d(days('LINK', [t(30 * M, 0), t(0, 1 * M), t(0, 1 * M)]), opts).coins).toEqual([]);
    // net only +$4M
    expect(computeSectionC3d(days('LINK', [t(2 * M, 0), t(2 * M, 0), t(0, 0)]), opts).coins).toEqual([]);
    // last day undoes 30% of the net
    expect(computeSectionC3d(days('LINK', [t(25 * M, 0), t(25 * M, 0), t(0, 12 * M)]), opts).coins).toEqual([]);
    // spot buyers negative (ZEC)
    expect(computeSectionC3d(days('ZEC', [t(20 * M, 0), t(20 * M, 0), t(20 * M, 0)]), opts).coins).toEqual([]);
    // illiquid (THIN under $10M)
    expect(computeSectionC3d(days('THIN', [t(20 * M, 0), t(20 * M, 0), t(20 * M, 0)]), { ...opts, spotNet3d: new Map([['THIN', 1 * M]]) }).coins).toEqual([]);
  });

  it('excludes the user pins and ranks by buying days, then net ÷ volume; no padding', () => {
    const r = computeSectionC3d([
      day('2026-10-18', { LINK: t(10 * M, 0), AKE: t(4 * M, 0), XRP: t(10 * M, 0) }),
      day('2026-10-19', { LINK: t(10 * M, 0), AKE: t(4 * M, 0), XRP: t(10 * M, 0) }),
      day('2026-10-20', { LINK: t(10 * M, 0), AKE: t(0, 1 * M) }),
    ], opts);
    // LINK 3 days; AKE 2 days, $7M on $12M volume; XRP 2 days, $20M on $400M volume
    expect(r.coins.map((c) => c.asset)).toEqual(['LINK', 'AKE', 'XRP']);
    const pinned = computeSectionC3d([day('2026-10-20', { LINK: t(10 * M, 0) })], { ...opts, exclude: new Set(['LINK']) });
    expect(pinned.coins).toEqual([]);
  });

  it('building mode until 3 days with recorded $; older days estimated from counts', () => {
    const legacy: FlowDayTally = { maxEvents: 4, maxUsd: 40 * M, high: 0, bullish: 3, bearish: 1 };
    expect(dayNet(legacy)).toEqual({ net: 20 * M, estimated: true });
    const r = computeSectionC3d([
      day('2026-10-18', { LINK: legacy }),
      day('2026-10-19', { LINK: legacy }),
      day('2026-10-20', { LINK: t(10 * M, 0) }),
    ], opts);
    expect(r.mode).toBe('building');
    expect(r.daysWithUsd).toBe(1);
    expect(r.coins.map((c) => c.asset)).toEqual(['LINK']);
  });
});
