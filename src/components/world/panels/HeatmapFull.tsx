'use client';

/**
 * HeatmapFull — liquidation heatmap.
 * 5 asset rows (free tier) or 10 (pro). Each bar spans ±20% price range.
 * Cluster intensity shading; white line = current price.
 * Ghost 6th row with PRO footer upsell when capped=true.
 */

import type { HeatmapPayload } from '@/lib/market/contracts';
import { formatPrice, formatUsd } from './format';

// Colour stops for cluster intensity
function clusterColor(intensity: number): string {
  // intensity 0–1: low → high liquidation density
  if (intensity < 0.25) return 'rgba(120,200,170,0.18)';
  if (intensity < 0.5)  return 'rgba(231,192,106,0.35)';
  if (intensity < 0.75) return 'rgba(255,150,100,0.5)';
  return 'rgba(255,107,129,0.7)';
}

// Map an asset symbol to a short coin badge color
const COIN_COLORS: Record<string, string> = {
  BTC:  '#f7931a',
  ETH:  '#627eea',
  SOL:  '#9945ff',
  BNB:  '#f0b90b',
  AVAX: '#e84142',
  ARB:  '#28a0f0',
  DOGE: '#c2a633',
  LINK: '#2a5ada',
  APT:  '#5bc8f5',
  SUI:  '#4da2ff',
};

type Props = {
  data: HeatmapPayload;
};

const RANGE_PCT = 0.20; // ±20% price range displayed

export default function HeatmapFull({ data }: Props) {
  const { assets, capped } = data;
  const displayAssets = assets.slice(0, 5);

  return (
    <div className="w-oc-hm">
      {/* Legend header */}
      <div className="w-oc-hm-legend-top">
        <span>-20%</span>
        <span>Current Price</span>
        <span>+20%</span>
      </div>

      {/* Asset rows */}
      <div className="w-oc-hm-rows">
        {displayAssets.map(({ asset, currentPrice, clusters }) => {
          const priceMin = currentPrice * (1 - RANGE_PCT);
          const priceMax = currentPrice * (1 + RANGE_PCT);
          const priceRange = priceMax - priceMin;

          // Find max volume for normalising intensity
          const maxVol = Math.max(...clusters.map(c => c.volumeUsd), 1);

          // Current price marker position (%)
          const currentPct = ((currentPrice - priceMin) / priceRange) * 100;

          const coinColor = COIN_COLORS[asset] ?? '#8ea69c';

          return (
            <div key={asset} className="w-oc-hm-row">
              {/* Asset symbol */}
              <div className="w-oc-hm-sym">
                <span
                  className="w-oc-coin"
                  style={{ background: coinColor }}
                  aria-hidden="true"
                >
                  {asset.slice(0, 1)}
                </span>
                <span>{asset}</span>
              </div>

              {/* Cluster bar */}
              <div
                className="w-oc-hm-bar"
                role="img"
                aria-label={`${asset} liquidation clusters`}
              >
                {clusters.map((cluster, i) => {
                  const pct = ((cluster.price - priceMin) / priceRange) * 100;
                  if (pct < 0 || pct > 100) return null;
                  const intensity = cluster.volumeUsd / maxVol;
                  const barW = Math.max(2, (cluster.volumeUsd / maxVol) * 8 + 2);
                  return (
                    <div
                      key={i}
                      className="w-oc-hm-cluster"
                      style={{
                        left: `${Math.min(98, pct).toFixed(1)}%`,
                        width: `${barW}px`,
                        background: clusterColor(intensity),
                        height: '100%',
                        position: 'absolute',
                        borderRadius: 2,
                      }}
                      title={`${formatUsd(cluster.volumeUsd)} at ${formatPrice(cluster.price)}`}
                    />
                  );
                })}

                {/* Current price white line */}
                <div
                  className="w-oc-hm-now"
                  style={{ left: `${currentPct.toFixed(1)}%` }}
                  aria-label="Current price"
                />
              </div>

              {/* Price label */}
              <div className="w-oc-hm-price">{formatPrice(currentPrice)}</div>
            </div>
          );
        })}

        {/* Ghost row — PRO upsell (only when capped) */}
        {capped && (
          <div className="w-oc-hm-row w-oc-hm-ghost" aria-hidden="true">
            <div className="w-oc-hm-sym">
              <span className="w-oc-coin" style={{ background: '#2a3a32' }}>?</span>
              <span>???</span>
            </div>
            <div className="w-oc-hm-bar w-oc-hm-bar-blur" />
            <div className="w-oc-hm-price w-oc-pro-lock">PRO</div>
          </div>
        )}
      </div>

      {/* Intensity scale */}
      <div className="w-oc-hm-scale">
        <span>Low</span>
        <div className="w-oc-hm-grad" aria-hidden="true" />
        <span>High Liq.</span>
      </div>

      {/* PRO footer */}
      {capped && (
        <div className="w-oc-hm-foot">
          <span className="w-oc-hm-foot-text">
            Showing 5 of 10 assets
          </span>
          <span className="w-oc-pro-badge">PRO — unlock all 10</span>
        </div>
      )}
    </div>
  );
}
