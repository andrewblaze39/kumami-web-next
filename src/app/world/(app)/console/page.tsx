'use client';

import { useMarketData } from '@/components/world/panels/useMarketData';
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

  // A shared updatedAt fallback when we have stale data or no data yet
  const updatedAt = data?.marketConditions.updatedAt ?? new Date().toISOString();

  if (hasError) {
    return (
      <div className="w-content-inner">
        <h1 className="w-page-title">Market Intelligence</h1>
        <div className="w-console-error" role="alert">
          <p className="w-console-error-msg">
            Unable to load market data. {market.error}
          </p>
          <button
            className="w-btn w-btn-ghost w-btn-sm"
            onClick={market.refetch}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-content-inner w-console">
      {/* Page header */}
      <div className="w-console-head">
        <h1 className="w-page-title">Market Intelligence</h1>
        <p className="w-page-sub">
          Real-time macro, regime and market structure overview.
        </p>
        {market.status === 'error' && (
          <p className="w-console-stale-banner" role="status">
            Showing last available data — refresh failed. Will retry automatically.
          </p>
        )}
      </div>

      {/* 1. Market Conditions — top anchor panel */}
      {isLoading ? (
        <div className="w-panel w-panel-market-conditions w-panel-skeleton w-panel-skeleton-mc" aria-busy="true" />
      ) : data ? (
        <MarketConditions data={data.marketConditions} />
      ) : null}

      {/* 2. Regime chip row */}
      <RegimeChips
        chips={data?.regimeChips ?? []}
        loading={isLoading}
      />

      {/* 3. Grid of 4 panels */}
      <div className="w-console-grid">
        <HeatmapPreview
          data={data?.heatmapPreview ?? []}
          updatedAt={updatedAt}
          loading={isLoading}
        />

        <FlowRadarFeed
          events={data?.flowRadar ?? []}
          updatedAt={updatedAt}
          loading={isLoading}
        />

        <IntelPreview
          briefs={data?.intelPreview ?? []}
          updatedAt={updatedAt}
          loading={isLoading}
        />

        <RadarWatchlist
          items={data?.radarWatchlist ?? []}
          updatedAt={updatedAt}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
