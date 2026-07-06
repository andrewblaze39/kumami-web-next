import { describe, it, expect } from 'vitest';
import { computeHeatmap, type HeatmapInputs, type HeatmapCluster } from '../heatmap';

// Doc lines 638–668.
//
// Scan clusters ±15% of current price.
// For above and below: find largest cluster by volume.
//
// Distance bands for largest cluster above:
//   0–3%:  "Immediate Short Target at $[X]"  (red, urgent)
//   3–8%:  "Short Squeeze Zone at $[X]"      (amber)
//   8–15%: "Upper Liq Cluster at $[X]"       (grey)
//   None in range: no upper tag
//
// Distance bands for largest cluster below:
//   0–3%:  "Immediate Long Target at $[X]"   (red, urgent)
//   3–8%:  "Long Flush Zone at $[X]"         (amber)
//   8–15%: "Lower Liq Cluster at $[X]"       (grey)
//   None in range: no lower tag
//
// Combined zone tag:
//   Large clusters both above AND below within 5%  → "Price in Contested Zone — Volatility Likely"
//   Clusters only above (any distance)             → "Upside Magnet — Short Squeeze Setup"
//   Clusters only below (any distance)             → "Downside Magnet — Long Flush Setup"
//   No significant clusters within 15%             → "Clear Zone — Lower Forced Movement Risk"
//
// "Significance" threshold: the doc says "rank by volume" and "significant cluster" but doesn't
// give a numeric significance threshold. Decision: caller passes clusters with their volumes;
// we define a significance threshold as a parameter (minSignificantVolumeUsd, default 0 meaning
// all passed clusters are significant). Callers should filter before passing.
//
// Boundary decisions:
//   Distance 0–3%: includes 0% (same price level) and 3% exactly
//   Distance 3–8%: >3% and ≤8% (3% belongs to previous band, so 3% → Immediate?)
//   Actually doc uses "0–3%" and "3–8%" which share the 3% boundary.
//   Decision: 3% belongs to the "3–8%" band (Short Squeeze Zone). 0–3% exclusive upper.
//   0% to <3% → Immediate; 3% to <8% → Squeeze Zone; 8% to ≤15% → Cluster tag.
//   Similarly 8% boundary: 8% belongs to Upper Liq Cluster band (8–15%).
//
// "Within 5%" for Contested Zone: both clusters are within 5% distance from current price.

describe('computeHeatmap — upper cluster distance bands', () => {
  const price = 100_000; // $100k BTC

  it('Immediate Short Target when above cluster < 3% away', () => {
    const clusters: HeatmapCluster[] = [{ price: 102_000, volumeUsd: 1_000_000 }]; // 2% above
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.upperTag?.label).toMatch(/^Immediate Short Target/);
    expect(r.upperTag?.color).toBe('red');
  });

  it('Immediate Short Target at exactly 0% (same price level)', () => {
    const clusters: HeatmapCluster[] = [{ price: price, volumeUsd: 1_000_000 }];
    // Same price — 0% distance above (or below). Above means price = currentPrice.
    // Test: price=currentPrice cluster should be treated as 0 distance above.
    const r = computeHeatmap({ currentPrice: price, clusters });
    // Could be upper or lower — implementation detail. Test that we get some immediate tag.
    const hasImmediate = r.upperTag?.label?.includes('Immediate') || r.lowerTag?.label?.includes('Immediate');
    expect(hasImmediate).toBe(true);
  });

  it('Short Squeeze Zone at exactly 3% above', () => {
    const clusters: HeatmapCluster[] = [{ price: 103_000, volumeUsd: 1_000_000 }]; // 3% above
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.upperTag?.label).toMatch(/^Short Squeeze Zone/);
    expect(r.upperTag?.color).toBe('amber');
  });

  it('Short Squeeze Zone between 3–8% above', () => {
    const clusters: HeatmapCluster[] = [{ price: 105_000, volumeUsd: 1_000_000 }]; // 5% above
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.upperTag?.label).toMatch(/^Short Squeeze Zone/);
  });

  it('Short Squeeze Zone at exactly 7.9% above', () => {
    const clusters: HeatmapCluster[] = [{ price: 107_900, volumeUsd: 1_000_000 }];
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.upperTag?.label).toMatch(/^Short Squeeze Zone/);
  });

  it('Upper Liq Cluster at exactly 8% above', () => {
    const clusters: HeatmapCluster[] = [{ price: 108_000, volumeUsd: 1_000_000 }]; // 8% above
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.upperTag?.label).toMatch(/^Upper Liq Cluster/);
    expect(r.upperTag?.color).toBe('grey');
  });

  it('Upper Liq Cluster at 15% above', () => {
    const clusters: HeatmapCluster[] = [{ price: 115_000, volumeUsd: 1_000_000 }];
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.upperTag?.label).toMatch(/^Upper Liq Cluster/);
  });

  it('no upper tag when cluster is beyond 15% above', () => {
    const clusters: HeatmapCluster[] = [{ price: 120_000, volumeUsd: 1_000_000 }]; // 20% above
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.upperTag).toBeNull();
  });
});

describe('computeHeatmap — lower cluster distance bands', () => {
  const price = 100_000;

  it('Immediate Long Target when below cluster < 3% away', () => {
    const clusters: HeatmapCluster[] = [{ price: 98_000, volumeUsd: 1_000_000 }]; // 2% below
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.lowerTag?.label).toMatch(/^Immediate Long Target/);
    expect(r.lowerTag?.color).toBe('red');
  });

  it('Long Flush Zone at exactly 3% below', () => {
    const clusters: HeatmapCluster[] = [{ price: 97_000, volumeUsd: 1_000_000 }]; // 3% below
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.lowerTag?.label).toMatch(/^Long Flush Zone/);
    expect(r.lowerTag?.color).toBe('amber');
  });

  it('Long Flush Zone between 3–8% below', () => {
    const clusters: HeatmapCluster[] = [{ price: 95_000, volumeUsd: 1_000_000 }]; // 5% below
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.lowerTag?.label).toMatch(/^Long Flush Zone/);
  });

  it('Lower Liq Cluster at exactly 8% below', () => {
    const clusters: HeatmapCluster[] = [{ price: 92_000, volumeUsd: 1_000_000 }]; // 8% below
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.lowerTag?.label).toMatch(/^Lower Liq Cluster/);
    expect(r.lowerTag?.color).toBe('grey');
  });

  it('no lower tag when beyond 15% below', () => {
    const clusters: HeatmapCluster[] = [{ price: 80_000, volumeUsd: 1_000_000 }]; // 20% below
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.lowerTag).toBeNull();
  });
});

describe('computeHeatmap — zone tag (combined verdict)', () => {
  const price = 100_000;

  it('Contested Zone when significant clusters both above AND below within 5%', () => {
    const clusters: HeatmapCluster[] = [
      { price: 102_000, volumeUsd: 1_000_000 }, // 2% above
      { price: 98_000,  volumeUsd: 1_000_000 }, // 2% below
    ];
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.verdict.label).toBe('Price in Contested Zone — Volatility Likely');
  });

  it('Upside Magnet when cluster only above', () => {
    const clusters: HeatmapCluster[] = [{ price: 105_000, volumeUsd: 1_000_000 }];
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.verdict.label).toBe('Upside Magnet — Short Squeeze Setup');
  });

  it('Downside Magnet when cluster only below', () => {
    const clusters: HeatmapCluster[] = [{ price: 95_000, volumeUsd: 1_000_000 }];
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.verdict.label).toBe('Downside Magnet — Long Flush Setup');
  });

  it('Clear Zone when no significant clusters within 15%', () => {
    const r = computeHeatmap({ currentPrice: price, clusters: [] });
    expect(r.verdict.label).toBe('Clear Zone — Lower Forced Movement Risk');
  });

  it('Clear Zone when clusters exist but all beyond 15%', () => {
    const clusters: HeatmapCluster[] = [
      { price: 120_000, volumeUsd: 1_000_000 },
      { price: 80_000,  volumeUsd: 1_000_000 },
    ];
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.verdict.label).toBe('Clear Zone — Lower Forced Movement Risk');
  });

  it('Contested Zone requires both clusters within 5% (not just any distance)', () => {
    // Above at 4% (within 5%), below at 10% (beyond 5%) → Contested requires BOTH within 5%
    // If below is at 10%, it's not within 5%, so not Contested
    const clusters: HeatmapCluster[] = [
      { price: 104_000, volumeUsd: 1_000_000 }, // 4% above → within 5%
      { price: 90_000,  volumeUsd: 1_000_000 }, // 10% below → NOT within 5%
    ];
    const r = computeHeatmap({ currentPrice: price, clusters });
    // Not contested; has clusters both sides but below is outside 5% — verdict is NOT Contested
    expect(r.verdict.label).not.toBe('Price in Contested Zone — Volatility Likely');
  });

  it('price in tag label matches cluster price', () => {
    const clusters: HeatmapCluster[] = [{ price: 105_000, volumeUsd: 1_000_000 }];
    const r = computeHeatmap({ currentPrice: price, clusters });
    expect(r.upperTag?.label).toContain('$105000');
  });
});

describe('computeHeatmap — selects largest cluster by volume', () => {
  const price = 100_000;

  it('picks larger volume cluster over smaller one', () => {
    const clusters: HeatmapCluster[] = [
      { price: 102_000, volumeUsd: 500_000 },    // 2% above, small
      { price: 110_000, volumeUsd: 5_000_000 },  // 10% above, large
    ];
    const r = computeHeatmap({ currentPrice: price, clusters });
    // Largest above is 10% → Upper Liq Cluster
    expect(r.upperTag?.label).toMatch(/^Upper Liq Cluster/);
  });
});
