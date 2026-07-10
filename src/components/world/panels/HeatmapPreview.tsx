'use client';

import Link from 'next/link';
import type { ConsolePayload } from '@/lib/market/contracts';
import { formatUsd } from './format';
import { WIcon, heatColor } from './console-ui';

type Props = {
  data: ConsolePayload['heatmapPreview'];
  loading?: boolean;
};

// Cell layout on the 8-column treemap grid (reference sizes: lg 3×2, md 2×2, sm thin)
const CELL_LAYOUT = [
  { size: 'w-lg', w: 3, h: 2 },
  { size: 'w-lg', w: 3, h: 2 },
  { size: 'w-md', w: 2, h: 2 },
  { size: 'w-sm', w: 4, h: 1 },
  { size: 'w-sm', w: 4, h: 1 },
  { size: 'w-sm', w: 2, h: 1 },
  { size: 'w-sm', w: 1, h: 1 },
  { size: 'w-sm', w: 1, h: 1 },
];

export default function HeatmapPreview({ data, loading }: Props) {
  return (
    <section className="w-apanel" aria-label="On-Chain Insights">
      <div className="w-apanel-h">
        <span className="w-ttl">
          <span className="w-ic"><WIcon name="layers" /></span>
          {' '}On-Chain Insights{' '}
          <span
            className="w-oc-q"
            tabIndex={0}
            title="See what’s happening beneath the price — where money is moving, who’s buying, and how risky the market is right now."
          >
            ?
          </span>{' '}
          <span className="w-sub">· 24h heatmap</span>
        </span>
        <span className="w-delay-note">
          <WIcon name="clock" /> aggregate · 15m delay
        </span>
      </div>

      <div className="w-apanel-b">
        {loading ? (
          <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
        ) : data.length === 0 ? (
          <p className="w-panel-empty">No heatmap data available.</p>
        ) : (
          <div className="w-treemap w-compact" aria-label="Liquidation heatmap assets">
            {data.slice(0, 8).map((row, i) => {
              const layout = CELL_LAYOUT[i] ?? { size: 'w-sm', w: 2, h: 1 };
              // Long/short skew drives the heat colour: >50% long = green, <50% = red
              const skew = (row.longShare - 50) / 5;
              const txt = Math.abs(skew) > 1.6 ? '#fff' : 'rgba(255,255,255,.92)';
              return (
                <div
                  key={row.asset}
                  className={`w-tm-cell ${layout.size}`}
                  style={{
                    gridColumn: `span ${layout.w}`,
                    gridRow: `span ${layout.h}`,
                    background: heatColor(skew),
                    color: txt,
                  }}
                  title={`${row.asset}: ${row.longShare.toFixed(1)}% long liquidations · ${formatUsd(row.liqUsd24h)} liquidated in 24h`}
                >
                  <div className="w-tm-sym">{row.asset}</div>
                  <div>
                    <div className="w-tm-chg">{row.longShare.toFixed(0)}% long</div>
                    <div className="w-tm-val">{formatUsd(row.liqUsd24h)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-apanel-foot">
        <span className="w-fmeta">Top movers · 24h liquidations</span>
        <Link href="/world/onchain">
          Open full insights <WIcon name="arrowR" />
        </Link>
      </div>
    </section>
  );
}
