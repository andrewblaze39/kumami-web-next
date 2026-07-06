import { describe, it, expect } from 'vitest';
import { mockProvider } from '../mockProvider';
import { createFixtures, ALL_COLORS } from '../fixtures';
import type { Verdict } from '@/lib/market/contracts';

const provider = mockProvider();

// ---------------------------------------------------------------------------
// console()
// ---------------------------------------------------------------------------

describe('console()', () => {
  it('regimeChips has exactly 5 entries', async () => {
    const data = await provider.console();
    expect(data.regimeChips).toHaveLength(5);
  });

  it('regimeChips assets are BTC/ETH/SOL/GOLD/SPX', async () => {
    const data = await provider.console();
    const assets = data.regimeChips.map((c) => c.asset);
    expect(assets).toEqual(['BTC', 'ETH', 'SOL', 'GOLD', 'SPX']);
  });

  it('flowRadar slice is exactly 6', async () => {
    const data = await provider.console();
    expect(data.flowRadar).toHaveLength(6);
  });

  it('intelPreview has exactly 4 entries', async () => {
    const data = await provider.console();
    expect(data.intelPreview).toHaveLength(4);
  });

  it('radarWatchlist has at most 4 entries', async () => {
    const data = await provider.console();
    expect(data.radarWatchlist.length).toBeLessThanOrEqual(4);
  });

  it('fearGreed is within 0–100', async () => {
    const data = await provider.console();
    expect(data.marketConditions.fearGreed).toBeGreaterThanOrEqual(0);
    expect(data.marketConditions.fearGreed).toBeLessThanOrEqual(100);
  });

  it('ETF flow 7d usd is within realistic range', async () => {
    const data = await provider.console();
    const { usd } = data.marketConditions.tiles.etfFlow7d;
    expect(Math.abs(usd)).toBeLessThanOrEqual(900_000_000);
  });
});

// ---------------------------------------------------------------------------
// onchain()
// ---------------------------------------------------------------------------

const ALL_PANEL_KEYS = [
  'funding', 'liquidations', 'netflow', 'longshort', 'heatmap',
  'cvd', 'premium', 'etf', 'oi', 'stablecoin',
] as const;

describe('onchain()', () => {
  it('all 10 panel keys present for BTC 24h', async () => {
    const data = await provider.onchain('BTC', '24h');
    for (const key of ALL_PANEL_KEYS) {
      expect(data.panels[key], `panel key '${key}' missing`).toBeDefined();
    }
  });

  it('all 10 panel keys present for ETH 7d', async () => {
    const data = await provider.onchain('ETH', '7d');
    for (const key of ALL_PANEL_KEYS) {
      expect(data.panels[key], `panel key '${key}' missing`).toBeDefined();
    }
  });

  it('each panel has a headline string', async () => {
    const data = await provider.onchain('SOL', '30d');
    for (const key of ALL_PANEL_KEYS) {
      expect(typeof data.panels[key].headline).toBe('string');
      expect(data.panels[key].headline.length).toBeGreaterThan(0);
    }
  });

  it('each panel has an updatedAt ISO string', async () => {
    const data = await provider.onchain('BTC', '7d');
    for (const key of ALL_PANEL_KEYS) {
      const ts = data.panels[key].updatedAt;
      expect(() => new Date(ts).toISOString()).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// heatmap()
// ---------------------------------------------------------------------------

describe('heatmap()', () => {
  it('free tier returns at most 5 assets and capped:true', async () => {
    const data = await provider.heatmap('free');
    expect(data.assets.length).toBeLessThanOrEqual(5);
    expect(data.capped).toBe(true);
  });

  it('pro tier returns 8–10 assets and capped:false', async () => {
    const data = await provider.heatmap('pro');
    expect(data.assets.length).toBeGreaterThanOrEqual(8);
    expect(data.assets.length).toBeLessThanOrEqual(10);
    expect(data.capped).toBe(false);
  });

  it('each asset has currentPrice > 0', async () => {
    const data = await provider.heatmap('pro');
    for (const a of data.assets) {
      expect(a.currentPrice).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// flowRadar()
// ---------------------------------------------------------------------------

describe('flowRadar()', () => {
  it('free tier returns at most 6 events', async () => {
    const events = await provider.flowRadar('free');
    expect(events.length).toBeLessThanOrEqual(6);
  });

  it('pro tier returns more events than free (up to 12)', async () => {
    const free = await provider.flowRadar('free');
    const pro = await provider.flowRadar('pro');
    expect(pro.length).toBeGreaterThanOrEqual(free.length);
    expect(pro.length).toBeLessThanOrEqual(12);
  });

  it('has at least one HIGH severity', async () => {
    const events = await provider.flowRadar('pro');
    expect(events.some((e) => e.severity === 'HIGH')).toBe(true);
  });

  it('has at least one MED severity', async () => {
    const events = await provider.flowRadar('pro');
    expect(events.some((e) => e.severity === 'MED')).toBe(true);
  });

  it('has at least one LOW severity', async () => {
    const events = await provider.flowRadar('pro');
    expect(events.some((e) => e.severity === 'LOW')).toBe(true);
  });

  it('has at least one whale_transfer HIGH event', async () => {
    const events = await provider.flowRadar('pro');
    expect(
      events.some((e) => e.type === 'whale_transfer' && e.severity === 'HIGH')
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// watchlist()
// ---------------------------------------------------------------------------

describe('watchlist()', () => {
  it('each asset has at most 2 actionTags', async () => {
    const data = await provider.watchlist('uid-test', 'free');
    for (const asset of data.assets) {
      expect(asset.actionTags.length).toBeLessThanOrEqual(2);
    }
  });

  it('has at least one amber or red actionTag (Overheated Long style)', async () => {
    const data = await provider.watchlist('uid-test', 'free');
    const allTags = data.assets.flatMap((a) => a.actionTags);
    expect(allTags.some((t) => t.color === 'amber' || t.color === 'red')).toBe(true);
  });

  it('free tier slots = 4', async () => {
    const data = await provider.watchlist('uid-test', 'free');
    expect(data.slots).toBe(4);
  });

  it('pro tier slots = 10', async () => {
    const data = await provider.watchlist('uid-test', 'pro');
    expect(data.slots).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// intelligence()
// ---------------------------------------------------------------------------

describe('intelligence()', () => {
  it('has at least one tier A brief', async () => {
    const data = await provider.intelligence('pro');
    expect(data.briefs.some((b) => b.tier === 'A')).toBe(true);
  });

  it('has at least one tier B brief', async () => {
    const data = await provider.intelligence('pro');
    expect(data.briefs.some((b) => b.tier === 'B')).toBe(true);
  });

  it('has at least one tier C brief', async () => {
    const data = await provider.intelligence('pro');
    expect(data.briefs.some((b) => b.tier === 'C')).toBe(true);
  });

  it('free tier briefs have no proInterpretation', async () => {
    const data = await provider.intelligence('free');
    for (const brief of data.briefs) {
      expect((brief as { proInterpretation?: unknown }).proInterpretation).toBeUndefined();
    }
  });

  it('pro tier has at least one brief with proInterpretation', async () => {
    const data = await provider.intelligence('pro');
    expect(data.briefs.some((b) => b.proInterpretation !== undefined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Determinism — two calls within the same hour-seed return identical data
// ---------------------------------------------------------------------------

describe('determinism', () => {
  it('console() returns identical data for the same hour seed', () => {
    const seed = Math.floor(Date.now() / 3_600_000);
    const f1 = createFixtures(seed);
    const f2 = createFixtures(seed);
    const c1 = f1.makeConsolePayload();
    const c2 = f2.makeConsolePayload();
    expect(c1.marketConditions.fearGreed).toBe(c2.marketConditions.fearGreed);
    expect(c1.regimeChips[0].price).toBe(c2.regimeChips[0].price);
    expect(c1.flowRadar[0].id).toBe(c2.flowRadar[0].id);
  });

  it('onchain() returns identical headlines for the same hour seed', () => {
    const seed = Math.floor(Date.now() / 3_600_000);
    const f1 = createFixtures(seed);
    const f2 = createFixtures(seed);
    const o1 = f1.makeOnChainPayload('BTC', '24h');
    const o2 = f2.makeOnChainPayload('BTC', '24h');
    expect(o1.panels.funding.headline).toBe(o2.panels.funding.headline);
    expect(o1.panels.etf.confidence).toBe(o2.panels.etf.confidence);
  });

  it('heatmap() returns identical prices for the same hour seed', () => {
    const seed = Math.floor(Date.now() / 3_600_000);
    const f1 = createFixtures(seed);
    const f2 = createFixtures(seed);
    const h1 = f1.makeHeatmapPayload('pro');
    const h2 = f2.makeHeatmapPayload('pro');
    expect(h1.assets[0].currentPrice).toBe(h2.assets[0].currentPrice);
  });
});

// ---------------------------------------------------------------------------
// Color coverage — every Verdict color used at least once
// ---------------------------------------------------------------------------

describe('color coverage', () => {
  it('all 6 Verdict colors appear across console + onchain payloads', async () => {
    const consolePay = await provider.console();
    const onchainPay = await provider.onchain('BTC', '24h');

    const usedColors = new Set<Verdict['color']>();

    // Collect from console market conditions
    usedColors.add(consolePay.marketConditions.verdict.color);
    consolePay.marketConditions.tags.forEach((t) => usedColors.add(t.color));

    // Collect from regimeChips — derive color from regime
    // (regime chips don't have color; we rely on onchain panels and flow events)

    // Collect from flowRadar
    // (flow events don't have verdict colors; collect from onchain panels)

    // Collect from onchain panels
    for (const key of ALL_PANEL_KEYS) {
      usedColors.add(onchainPay.panels[key].verdict.color);
      onchainPay.panels[key].tags.forEach((t) => usedColors.add(t.color));
    }

    for (const color of ALL_COLORS) {
      expect(usedColors.has(color), `color '${color}' never used`).toBe(true);
    }
  });
});
