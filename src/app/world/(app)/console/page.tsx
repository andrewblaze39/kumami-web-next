'use client';

import { useMarketData } from '@/components/world/panels/useMarketData';
import { relativeTime } from '@/components/world/panels/format';
import { WIcon } from '@/components/world/panels/console-ui';
import MarketConditions from '@/components/world/panels/MarketConditions';
import RegimeChips from '@/components/world/panels/RegimeChips';
import HeatmapPreview from '@/components/world/panels/HeatmapPreview';
import FlowRadarFeed from '@/components/world/panels/FlowRadarFeed';
import IntelPreview from '@/components/world/panels/IntelPreview';
import RadarWatchlist from '@/components/world/panels/RadarWatchlist';

export default function ConsolePage() {
  const market = useMarketData();

  const isLoading = market.status === 'loading';
  const hasError = market.status === 'error' && !market.data;
  const data = market.data;

  // Real payload timestamp; undefined while loading
  const updatedAt = data?.marketConditions.updatedAt;

  if (hasError) {
    return (
      <div className="w-content-inner w-console">
        <div className="w-adv-head">
          <div>
            <h1>
              Market Intelligence{' '}
              <span className="w-pro-badge">
                <WIcon name="star" /> Advanced
              </span>
            </h1>
            <p>
              Your daily market briefing — overall mood, major assets, and anything urgent, all
              in one glance.
            </p>
          </div>
        </div>
        <div className="w-console-error" role="alert">
          <p className="w-console-error-msg">
            Unable to load market data. {market.error}
          </p>
          <button className="w-btn w-btn-ghost w-btn-sm" onClick={market.refetch}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-content-inner w-console">
      {/* Page header */}
      <div className="w-adv-head">
        <div>
          <h1>
            Market Intelligence{' '}
            <span className="w-pro-badge">
              <WIcon name="star" /> Advanced
            </span>
          </h1>
          <p>
            Your daily market briefing — overall mood, major assets, and anything urgent, all in
            one glance.
          </p>
        </div>
        <span className="w-adv-updated">
          <span className="w-live-dot" /> Live
          {updatedAt ? ` · updated ${relativeTime(updatedAt)}` : ''}
        </span>
      </div>

      {market.status === 'error' && (
        <p className="w-console-stale-banner" role="status">
          Showing last available data — refresh failed. Will retry automatically.
        </p>
      )}

      {/* 1. Market Conditions — top anchor panel */}
      {isLoading ? (
        <div
          className="w-apanel w-span-2 w-mc-panel w-panel-skeleton w-panel-skeleton-mc"
          aria-busy="true"
        />
      ) : data ? (
        <MarketConditions data={data.marketConditions} />
      ) : null}

      {/* 2. Regime chip row */}
      <RegimeChips chips={data?.regimeChips ?? []} loading={isLoading} />

      {/* 3. Bento row 2 — On-Chain Insights + Flow Radar */}
      <div className="w-bento w-r2">
        <HeatmapPreview data={data?.heatmapPreview ?? []} loading={isLoading} />
        <FlowRadarFeed events={data?.flowRadar ?? []} loading={isLoading} />
      </div>

      {/* 4. Bento row 3 — Intelligence + Watchlist */}
      <div className="w-bento w-r3">
        <IntelPreview briefs={data?.intelPreview ?? []} loading={isLoading} />
        <RadarWatchlist items={data?.radarWatchlist ?? []} loading={isLoading} />
      </div>
    </div>
  );
}
