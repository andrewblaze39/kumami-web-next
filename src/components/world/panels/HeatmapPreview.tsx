'use client';

import Link from 'next/link';
import type { ConsolePayload } from '@/lib/market/contracts';
import { formatUsd, relativeTime } from './format';

type Props = {
  data: ConsolePayload['heatmapPreview'];
  updatedAt: string;
  loading?: boolean;
};

export default function HeatmapPreview({ data, updatedAt, loading }: Props) {
  return (
    <section className="w-panel w-panel-heatmap" aria-label="Heatmap Preview">
      <div className="w-panel-header">
        <span className="w-panel-eyebrow">Liquidation Heatmap</span>
        <time className="w-panel-ts" dateTime={updatedAt} title={updatedAt}>
          {relativeTime(updatedAt)}
        </time>
      </div>

      {loading ? (
        <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
      ) : data.length === 0 ? (
        <p className="w-panel-empty">No heatmap data available.</p>
      ) : (
        <ul className="w-heatmap-list" aria-label="Liquidation heatmap assets">
          {data.map(row => {
            const longPct = row.longShare;
            const shortPct = 100 - longPct;
            return (
              <li key={row.asset} className="w-heatmap-row">
                <span className="w-hm-asset" title={`${row.asset} liquidation data`}>
                  {row.asset}
                </span>
                <div
                  className="w-hm-bar"
                  role="img"
                  aria-label={`${row.asset}: ${longPct.toFixed(0)}% long liquidations, ${shortPct.toFixed(0)}% short`}
                  title={`Long: ${longPct.toFixed(1)}% / Short: ${shortPct.toFixed(1)}%`}
                >
                  <div
                    className="w-hm-bar-long"
                    style={{ width: `${longPct}%` }}
                  />
                  <div
                    className="w-hm-bar-short"
                    style={{ width: `${shortPct}%` }}
                  />
                </div>
                <span
                  className="w-hm-liq"
                  title={`Total liquidated in 24h: ${formatUsd(row.liqUsd24h)}`}
                >
                  {formatUsd(row.liqUsd24h)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="w-panel-footer">
        <Link href="/world/onchain" className="w-panel-footer-link">
          Open full insights →
        </Link>
      </div>
    </section>
  );
}
