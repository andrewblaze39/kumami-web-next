'use client';

import type { ConsolePayload } from '@/lib/market/contracts';
import { formatPrice, formatChange, relativeTime } from './format';

type Props = {
  items: ConsolePayload['radarWatchlist'];
  updatedAt?: string;
  loading?: boolean;
};

export default function RadarWatchlist({ items, updatedAt, loading }: Props) {
  return (
    <section className="w-panel w-panel-watchlist" aria-label="Radar Watchlist">
      <div className="w-panel-header">
        <div className="w-panel-header-left">
          {/* PM requirement: exact header text — users must not confuse with curated list */}
          <span className="w-panel-eyebrow">Radar Watchlist · auto-detected</span>
        </div>
        {updatedAt && (
          <time className="w-panel-ts" dateTime={updatedAt} title={updatedAt}>
            {relativeTime(updatedAt)}
          </time>
        )}
      </div>

      {loading ? (
        <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
      ) : items.length === 0 ? (
        <p className="w-panel-empty">
          No assets flagged by the radar at this time. Check back shortly.
        </p>
      ) : (
        <ul className="w-watchlist-list" aria-label="Radar watchlist assets">
          {items.map(item => (
            <li key={item.asset} className="w-watchlist-row">
              <div className="w-wl-left">
                <span
                  className="w-wl-asset"
                  title={`Asset: ${item.asset}`}
                >
                  {item.asset}
                </span>
                <span
                  className="w-wl-signal"
                  title={`Auto-detected signal: ${item.signal}`}
                >
                  {item.signal}
                </span>
              </div>
              <div className="w-wl-right">
                <span
                  className="w-wl-price"
                  title={`Current price: $${formatPrice(item.price)}`}
                >
                  ${formatPrice(item.price)}
                </span>
                <span
                  className={`w-wl-change ${item.change24h >= 0 ? 'w-bull' : 'w-bear'}`}
                  title="24-hour price change"
                >
                  {formatChange(item.change24h)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
