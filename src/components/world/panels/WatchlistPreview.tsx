'use client';

/**
 * Console's Watchlist preview panel.
 *
 * Shows the SAME fixed 5-asset Watchlist Plus roster (BTC/ETH/SOL/BNB/HYPE)
 * as the standalone /world/watchlist page — not a separately-computed
 * bullish-flow auto-pick. An earlier version of this panel pulled from a
 * distinct "Radar Watchlist" engine that could show different (and fewer)
 * assets than the real Watchlist; that engine has been retired so Console
 * and the Watchlist page can never disagree about what's being tracked.
 */

import Link from 'next/link';
import type { WatchlistApiResponse } from '@/lib/market/contracts';
import { useMarketEndpoint } from './useMarketEndpoint';
import { formatPrice, formatChange, verdictColorClass } from './format';
import { WIcon, CoinBadge } from './console-ui';

export default function WatchlistPreview() {
  const { status, data } = useMarketEndpoint<WatchlistApiResponse>('/api/market/watchlist');
  const loading = status === 'loading';
  // Most notable signal first — "Quiet" assets sink to the bottom so the
  // panel leads with whatever's actually worth a glance right now.
  const assets = [...(data?.assets ?? [])].sort((a, b) => {
    const aQuiet = a.primarySignal.label === 'Quiet' ? 1 : 0;
    const bQuiet = b.primarySignal.label === 'Quiet' ? 1 : 0;
    return aQuiet - bQuiet;
  });

  return (
    <section className="w-apanel w-self-start" aria-label="Watchlist" data-tour="watchlist">
      <div className="w-apanel-h">
        <span className="w-ttl">
          <span className="w-ic"><WIcon name="bookmark" /></span>
          {' '}Watchlist{' '}
          <span
            className="w-oc-q"
            tabIndex={0}
            title="Tracks your assets and flags when something changes — whale moves, crowded leverage, danger zones — so you know when to pay attention."
          >
            ?
          </span>
        </span>
        <span className="w-sub">{assets.length} tracked</span>
      </div>

      {loading ? (
        <div className="w-apanel-b">
          <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
        </div>
      ) : assets.length === 0 ? (
        <div className="w-apanel-b">
          <p className="w-panel-empty">Couldn&apos;t load the watchlist right now.</p>
        </div>
      ) : (
        <div aria-label="Watchlist assets">
          {assets.map((a) => (
            <div key={a.asset} className="w-wli-item">
              <CoinBadge sym={a.asset} size={22} />
              <div className="w-wli-main">
                <b>{a.asset}</b>
                <span className={`w-wli-sig ${verdictColorClass(a.primarySignal.color)}`}>
                  {a.primarySignal.icon} {a.primarySignal.label}
                </span>
                <span className="w-wli-sig-detail">{a.primarySignal.detail}</span>
              </div>
              <div className="w-wli-price">
                <b title={`Current price: $${formatPrice(a.price)}`}>
                  ${formatPrice(a.price)}
                </b>
                <span className={a.change24h >= 0 ? 'w-bull' : 'w-bear'} title="24-hour price change">
                  {formatChange(a.change24h)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="w-apanel-foot">
        <span className="w-fmeta">
          <WIcon name="bookmark" /> Fixed 5-asset roster
        </span>
        <Link href="/world/watchlist">
          Open Watchlist <WIcon name="arrowR" />
        </Link>
      </div>
    </section>
  );
}
