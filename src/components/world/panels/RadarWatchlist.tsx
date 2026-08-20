'use client';

import Link from 'next/link';
import type { ConsolePayload } from '@/lib/market/contracts';
import { formatPrice, formatChange } from './format';
import { WIcon, CoinBadge } from './console-ui';

type Props = {
  items: ConsolePayload['radarWatchlist'];
  loading?: boolean;
};

export default function RadarWatchlist({ items, loading }: Props) {
  return (
    <section className="w-apanel w-self-start" aria-label="Watchlist">
      <div className="w-apanel-h">
        <span className="w-ttl">
          <span className="w-ic"><WIcon name="bookmark" /></span>
          {' '}Watchlist{' '}
          <span
            className="w-oc-q"
            tabIndex={0}
            title="Tracks your assets and flags when something changes — whale moves, crowded leverage, danger zones — so you know when to pay attention. Auto-ranked from the strongest bullish on-chain flow across tracked assets."
          >
            ?
          </span>
        </span>
        <span className="w-sub">{items.length} bullish picks</span>
      </div>

      {loading ? (
        <div className="w-apanel-b">
          <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
        </div>
      ) : items.length === 0 ? (
        <div className="w-apanel-b">
          <p className="w-panel-empty">
            No assets flagged by the radar at this time. Check back shortly.
          </p>
        </div>
      ) : (
        <div aria-label="Radar watchlist assets">
          {items.map(item => (
            <div key={item.asset} className="w-wli-item">
              <CoinBadge sym={item.asset} size={22} />
              <div className="w-wli-main">
                <b>{item.asset}</b>
                <span className="w-wli-sig" title={`Auto-detected signal: ${item.signal}`}>
                  <WIcon name="flame" /> {item.signal}
                </span>
              </div>
              <div className="w-wli-price">
                <b title={`Current price: $${formatPrice(item.price)}`}>
                  ${formatPrice(item.price)}
                </b>
                <span
                  className={item.change24h >= 0 ? 'w-bull' : 'w-bear'}
                  title="24-hour price change"
                >
                  {formatChange(item.change24h)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="w-apanel-foot">
        <span className="w-fmeta">
          <WIcon name="flame" /> Auto-picked from Flow Radar
        </span>
        <Link href="/world/watchlist">
          Open Watchlist <WIcon name="arrowR" />
        </Link>
      </div>
    </section>
  );
}
