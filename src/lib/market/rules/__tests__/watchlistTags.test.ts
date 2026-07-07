import { describe, it, expect } from 'vitest';
import { computeWatchlistTags, type WatchlistTagsInputs } from '../watchlistTags';

// Doc lines 1062–1092.
// Signal 1 (Funding): > +0.1% → "Overheated" red; < 0% → "Short Heavy" amber
// Signal 2 (Liq prox): ≤ 3% → "Near Liq Zone" red; ≤ 5% → "Watch Level" amber
// Signal 3 (L/S): > 70% → "Crowded Long" amber; < 30% → "Crowded Short" amber
// Regime: OI+price up → "Trending Up"; OI+price down → "Trending Down";
//         OI up + price flat → "Coiling"; low OI+vol → "Ranging"
// Max 2 action tags; severity: red > amber

const neutral: WatchlistTagsInputs = {
  fundingRate: 0,
  priceToLiqPct: 1,      // 100% away — no cluster
  pctLong: 50,
  oiDirection: 'flat',
  priceDirection: 'flat',
};

describe('computeWatchlistTags — Signal 1: Funding Rate', () => {
  it('Overheated (red) when fundingRate > +0.1%', () => {
    const r = computeWatchlistTags({ ...neutral, fundingRate: 0.0011 });
    expect(r.actionTags.some(t => t.label === 'Overheated' && t.color === 'red')).toBe(true);
  });

  it('no Overheated at exactly +0.1% (not strictly greater)', () => {
    const r = computeWatchlistTags({ ...neutral, fundingRate: 0.001 });
    expect(r.actionTags.some(t => t.label === 'Overheated')).toBe(false);
  });

  it('Short Heavy (amber) when fundingRate < 0%', () => {
    const r = computeWatchlistTags({ ...neutral, fundingRate: -0.001 });
    expect(r.actionTags.some(t => t.label === 'Short Heavy' && t.color === 'amber')).toBe(true);
  });

  it('no Short Heavy at exactly 0%', () => {
    const r = computeWatchlistTags({ ...neutral, fundingRate: 0 });
    expect(r.actionTags.some(t => t.label === 'Short Heavy')).toBe(false);
  });
});

describe('computeWatchlistTags — Signal 2: Liquidation Proximity', () => {
  it('Near Liq Zone (red) when priceToLiqPct ≤ 3%', () => {
    const r = computeWatchlistTags({ ...neutral, priceToLiqPct: 0.03 });
    expect(r.actionTags.some(t => t.label === 'Near Liq Zone' && t.color === 'red')).toBe(true);
  });

  it('Near Liq Zone at exactly 3% boundary', () => {
    const r = computeWatchlistTags({ ...neutral, priceToLiqPct: 0.03 });
    expect(r.actionTags.some(t => t.label === 'Near Liq Zone')).toBe(true);
  });

  it('Watch Level (amber) when 3% < priceToLiqPct ≤ 5%', () => {
    const r = computeWatchlistTags({ ...neutral, priceToLiqPct: 0.04 });
    expect(r.actionTags.some(t => t.label === 'Watch Level' && t.color === 'amber')).toBe(true);
  });

  it('Watch Level at exactly 5%', () => {
    const r = computeWatchlistTags({ ...neutral, priceToLiqPct: 0.05 });
    expect(r.actionTags.some(t => t.label === 'Watch Level')).toBe(true);
  });

  it('no liq tag when > 5%', () => {
    const r = computeWatchlistTags({ ...neutral, priceToLiqPct: 0.06 });
    expect(r.actionTags.some(t => t.label === 'Near Liq Zone' || t.label === 'Watch Level')).toBe(false);
  });
});

describe('computeWatchlistTags — Signal 3: Long/Short Ratio', () => {
  it('Crowded Long (amber) when pctLong > 70%', () => {
    const r = computeWatchlistTags({ ...neutral, pctLong: 71 });
    expect(r.actionTags.some(t => t.label === 'Crowded Long' && t.color === 'amber')).toBe(true);
  });

  it('no Crowded Long at exactly 70% (strictly greater required)', () => {
    const r = computeWatchlistTags({ ...neutral, pctLong: 70 });
    expect(r.actionTags.some(t => t.label === 'Crowded Long')).toBe(false);
  });

  it('Crowded Short (amber) when pctLong < 30%', () => {
    const r = computeWatchlistTags({ ...neutral, pctLong: 29 });
    expect(r.actionTags.some(t => t.label === 'Crowded Short' && t.color === 'amber')).toBe(true);
  });

  it('no Crowded Short at exactly 30%', () => {
    const r = computeWatchlistTags({ ...neutral, pctLong: 30 });
    expect(r.actionTags.some(t => t.label === 'Crowded Short')).toBe(false);
  });

  it('no tag for 40–60% range', () => {
    for (const pct of [40, 50, 60]) {
      const r = computeWatchlistTags({ ...neutral, pctLong: pct });
      expect(r.actionTags.some(t => t.label === 'Crowded Long' || t.label === 'Crowded Short')).toBe(false);
    }
  });
});

describe('computeWatchlistTags — max 2 action tags with severity ordering', () => {
  it('returns at most 2 action tags even when all 3 signals fire', () => {
    const r = computeWatchlistTags({
      fundingRate: 0.002,      // Overheated (red)
      priceToLiqPct: 0.02,    // Near Liq Zone (red)
      pctLong: 75,             // Crowded Long (amber)
      oiDirection: 'up',
      priceDirection: 'up',
    });
    expect(r.actionTags).toHaveLength(2);
  });

  it('selects the 2 most severe when all 3 signals fire (red > amber)', () => {
    const r = computeWatchlistTags({
      fundingRate: 0.002,      // Overheated (red) — Signal 1
      priceToLiqPct: 0.02,    // Near Liq Zone (red) — Signal 2
      pctLong: 75,             // Crowded Long (amber) — Signal 3
      oiDirection: 'flat',
      priceDirection: 'flat',
    });
    const labels = r.actionTags.map(t => t.label);
    // Both red tags should be selected over the amber
    expect(labels).toContain('Overheated');
    expect(labels).toContain('Near Liq Zone');
    expect(labels).not.toContain('Crowded Long');
  });

  it('returns 0 action tags when no signals fire', () => {
    const r = computeWatchlistTags(neutral);
    expect(r.actionTags).toHaveLength(0);
  });

  it('returns 1 action tag when only 1 signal fires', () => {
    const r = computeWatchlistTags({ ...neutral, fundingRate: 0.002 });
    expect(r.actionTags).toHaveLength(1);
  });
});

describe('computeWatchlistTags — regime tag', () => {
  it('Trending Up when OI up + price up', () => {
    const r = computeWatchlistTags({ ...neutral, oiDirection: 'up', priceDirection: 'up' });
    expect(r.regimeTag.label).toBe('Trending Up');
    expect(r.regimeTag.color).toBe('grey-green');
  });

  it('Trending Down when OI down + price down', () => {
    const r = computeWatchlistTags({ ...neutral, oiDirection: 'down', priceDirection: 'down' });
    expect(r.regimeTag.label).toBe('Trending Down');
    expect(r.regimeTag.color).toBe('grey-red');
  });

  it('Coiling when OI up + price flat', () => {
    const r = computeWatchlistTags({ ...neutral, oiDirection: 'up', priceDirection: 'flat' });
    expect(r.regimeTag.label).toBe('Coiling');
    expect(r.regimeTag.color).toBe('amber');
  });

  it('Ranging when isLowOiLowVolume=true (overrides OI/price)', () => {
    const r = computeWatchlistTags({
      ...neutral, oiDirection: 'up', priceDirection: 'up', isLowOiLowVolume: true,
    });
    expect(r.regimeTag.label).toBe('Ranging');
  });

  it('Ranging for unlisted combination (OI down + price up)', () => {
    const r = computeWatchlistTags({ ...neutral, oiDirection: 'down', priceDirection: 'up' });
    expect(r.regimeTag.label).toBe('Ranging');
  });

  it('regime tag is NOT counted toward the 2-tag limit', () => {
    // All 3 signals + regime — result should still have max 2 action tags and 1 regime tag
    const r = computeWatchlistTags({
      fundingRate: 0.002,
      priceToLiqPct: 0.02,
      pctLong: 75,
      oiDirection: 'up',
      priceDirection: 'up',
    });
    expect(r.actionTags).toHaveLength(2);
    expect(r.regimeTag.label).toBe('Trending Up');
  });
});
