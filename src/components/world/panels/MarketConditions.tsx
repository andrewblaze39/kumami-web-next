'use client';

import type { ConsolePayload } from '@/lib/market/contracts';
import { formatUsd, formatChange, formatConfidence, relativeTime, verdictColorClass } from './format';

type Props = {
  data: ConsolePayload['marketConditions'];
  loading?: boolean;
};

export default function MarketConditions({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="w-panel w-panel-market-conditions" aria-busy="true">
        <div className="w-panel-skeleton w-panel-skeleton-mc" />
      </div>
    );
  }

  const { verdict, tags, confidence, interpretation, updatedAt, fearGreed, tiles } = data;
  const fearGreedLabel =
    fearGreed >= 75 ? 'Extreme Greed' :
    fearGreed >= 60 ? 'Greed' :
    fearGreed >= 40 ? 'Neutral' :
    fearGreed >= 25 ? 'Fear' : 'Extreme Fear';

  const fearGreedBarColor =
    fearGreed >= 75 ? 'var(--danger)' :
    fearGreed >= 60 ? 'var(--amber)' :
    fearGreed >= 40 ? 'var(--muted)' :
    fearGreed >= 25 ? 'var(--muted-2)' : 'var(--bear)';

  return (
    <section
      className={`w-panel w-panel-market-conditions w-panel-accent`}
      aria-label="Market Conditions"
    >
      {/* Header row */}
      <div className="w-panel-header">
        <div className="w-panel-header-left">
          <span className="w-panel-eyebrow">Market Conditions</span>
          <div className="w-panel-verdict-row">
            <span
              className={`w-verdict-chip ${verdictColorClass(verdict.color)}`}
              aria-label={`Verdict: ${verdict.label}`}
            >
              {verdict.label}
            </span>
            {tags.map((tag, i) => (
              <span
                key={i}
                className={`w-tag-chip ${verdictColorClass(tag.color)}`}
              >
                {tag.label}
              </span>
            ))}
            {confidence !== undefined && (
              <span
                className="w-confidence-badge"
                title={`Confidence score: ${formatConfidence(confidence)}`}
                aria-label={`Confidence ${formatConfidence(confidence)}`}
              >
                {formatConfidence(confidence)} conf.
              </span>
            )}
          </div>
        </div>
        <time className="w-panel-ts" dateTime={updatedAt} title={updatedAt}>
          Updated {relativeTime(updatedAt)}
        </time>
      </div>

      {/* Fear & Greed bar */}
      <div className="w-fg-bar-wrap">
        <div className="w-fg-labels">
          <span title="Fear & Greed Index (0 = Extreme Fear, 100 = Extreme Greed)">
            Fear &amp; Greed
          </span>
          <span className="w-fg-value" aria-label={`Fear and greed score: ${fearGreed}`}>
            {fearGreed} — {fearGreedLabel}
          </span>
        </div>
        <div
          className="w-fg-bar"
          role="progressbar"
          aria-valuenow={fearGreed}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Fear and greed: ${fearGreed}`}
        >
          <div
            className="w-fg-fill"
            style={{
              width: `${fearGreed}%`,
              background: fearGreedBarColor,
            }}
          />
        </div>
      </div>

      {/* Metric tiles */}
      <div className="w-tiles">
        {/* ETF Flow 7d */}
        <div className="w-tile">
          <span
            className="w-tile-label"
            title="Net ETF inflows/outflows over the past 7 days"
          >
            ETF Flow 7d
          </span>
          <span className={`w-tile-value ${tiles.etfFlow7d.usd >= 0 ? 'w-bull' : 'w-bear'}`}>
            {formatUsd(tiles.etfFlow7d.usd)}
          </span>
          <span
            className={`w-tile-change ${tiles.etfFlow7d.pctVsPrev >= 0 ? 'w-bull' : 'w-bear'}`}
            title="Change vs previous 7-day period"
          >
            {formatChange(tiles.etfFlow7d.pctVsPrev)} vs prior week
          </span>
        </div>

        {/* DXY */}
        <div className="w-tile">
          <span
            className="w-tile-label"
            title="US Dollar Index — measures USD strength against a basket of major currencies"
          >
            DXY
          </span>
          {tiles.dxy === null ? (
            <>
              <span className="w-tile-value w-muted">—</span>
              <span className="w-tile-change w-muted w-tile-pending">external source pending</span>
            </>
          ) : (
            <>
              <span className="w-tile-value">{tiles.dxy.value.toFixed(2)}</span>
              <span
                className={`w-tile-change ${tiles.dxy.dayChange >= 0 ? 'w-bull' : 'w-bear'}`}
                title="Day-over-day change"
              >
                {formatChange(tiles.dxy.dayChange)} today
              </span>
            </>
          )}
        </div>

        {/* On-Chain Bias */}
        <div className="w-tile">
          <span
            className="w-tile-label"
            title="Percentage of open positions that are long vs short across major exchanges"
          >
            On-Chain Bias
          </span>
          <span className={`w-tile-value ${tiles.onChainBias.pctLong >= 50 ? 'w-bull' : 'w-bear'}`}>
            {tiles.onChainBias.pctLong.toFixed(1)}% Long
          </span>
          <span
            className="w-tile-change w-muted"
            title="Long/short ratio"
          >
            L/S ratio {tiles.onChainBias.ratio.toFixed(2)}
          </span>
        </div>

        {/* Liquidations 24h */}
        <div className="w-tile">
          <span
            className="w-tile-label"
            title="Total value of liquidated positions in the last 24 hours"
          >
            Liq. 24h
          </span>
          <span className="w-tile-value w-bear">
            {formatUsd(tiles.liq24h.totalUsd)}
          </span>
          <span
            className={`w-tile-change ${tiles.liq24h.pctVsAvg7d >= 0 ? 'w-bear' : 'w-bull'}`}
            title="Change vs 7-day average liquidation volume"
          >
            {formatChange(tiles.liq24h.pctVsAvg7d)} vs 7d avg
          </span>
        </div>
      </div>

      {/* Interpretation */}
      {interpretation && (
        <p className="w-panel-read" aria-label="Market interpretation">
          {interpretation}
        </p>
      )}
    </section>
  );
}
