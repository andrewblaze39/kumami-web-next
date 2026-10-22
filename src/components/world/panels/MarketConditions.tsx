'use client';

import type { ConsolePayload } from '@/lib/market/contracts';
import { formatUsd, formatChange } from './format';
import { WIcon } from './console-ui';

// Verdict colour → text tone for the big regime label (reference .mc-regime .bull)
const REGIME_TONE: Record<string, string> = {
  green: 'w-bull',
  'grey-green': 'w-bull',
  grey: 'w-muted',
  amber: 'w-flat',
  'grey-red': 'w-bear',
  red: 'w-bear',
};

type Props = {
  data: ConsolePayload['marketConditions'];
};

export default function MarketConditions({ data }: Props) {
  const { verdict, confidence, fearGreed, fearGreedLabel, tiles } = data;

  return (
    <section className="w-apanel w-span-2 w-mc-panel" aria-label="Market Conditions" data-tour="market">
      <div className="w-apanel-h">
        <span className="w-ttl">
          <span className="w-ic"><WIcon name="spark" /></span>
          {' '}Market Conditions <span className="w-sub">· Today&apos;s Brief</span>
        </span>
        <span className="w-sub">Rule-based regime read</span>
      </div>

      <div className="w-mc-hero">
        {/* Left — global regime + fear & greed */}
        <div className="w-mc-left">
          <div className="w-mc-tag">Global Regime</div>
          <div className="w-mc-regime">
            <span className={REGIME_TONE[verdict.color] ?? 'w-flat'}>{verdict.label}</span>
          </div>
          <div className="w-mc-conf">
            Confidence <b>{confidence !== undefined ? confidence.toFixed(2) : '—'}</b> · from
            Fear &amp; Greed, ETF flows, funding and open interest
          </div>
          {/* AI read: the AI's text, or an honest state — never a template (Andrew, 22 Oct 2026). */}
          {data.interpretation ? (
            <p className="w-mc-ai" title="Written by AI from the verdict above — the verdict itself comes from the rule engine">
              {data.interpretation}
            </p>
          ) : (
            <p className="w-mc-ai w-ai-soon">{data.aiStatus === 'unavailable' ? 'AI read unavailable right now' : 'AI read · coming soon'}</p>
          )}
          <div
            className="w-senti-bar"
            role="progressbar"
            aria-valuenow={fearGreed ?? undefined}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={fearGreed !== null ? `Fear and greed: ${fearGreed}` : 'Fear and greed: no data'}
          >
            {fearGreed !== null && <span className="w-mk" style={{ left: `${fearGreed}%` }} />}
          </div>
          <div className="w-senti-scale">
            <span>Extreme Fear</span>
            <span>Neutral</span>
            <span>Extreme Greed</span>
          </div>
          <div className="w-mc-fearval">
            {fearGreed !== null ? (
              <>
                <b>{fearGreed}</b>
                <span>{fearGreedLabel}</span>
              </>
            ) : (
              <span className="w-muted">No data</span>
            )}
          </div>
        </div>

        {/* Right — macro tiles */}
        <div className="w-mc-right">
          <div className="w-macro-tile">
            <div className="w-ml"><WIcon name="layers" /> BTC ETF Net Flow</div>
            {tiles.etfFlow7d === null ? (
              <>
                <div className="w-mv w-muted">No data</div>
                <div className="w-mc-chg w-muted">Failed to load</div>
              </>
            ) : (
              <>
                <div className="w-mv">{formatUsd(tiles.etfFlow7d.usd)}</div>
                <div
                  className={`w-mc-chg ${tiles.etfFlow7d.usd >= 0 ? 'w-bull' : 'w-bear'}`}
                  title="Change vs previous 7-day period"
                >
                  {formatChange(tiles.etfFlow7d.pctVsPrev)} · vs prior 7d
                </div>
              </>
            )}
          </div>

          <div className="w-macro-tile">
            <div className="w-ml"><WIcon name="bolt" /> BTC Dominance</div>
            {tiles.btcDominance === null ? (
              <>
                <div className="w-mv w-muted">—</div>
                <div className="w-mc-chg w-muted">Coming soon</div>
              </>
            ) : (
              <>
                <div className="w-mv">{tiles.btcDominance.pct.toFixed(1)}%</div>
                <div className={`w-mc-chg ${tiles.btcDominance.dayChange >= 0 ? 'w-bull' : 'w-bear'}`}>
                  {formatChange(tiles.btcDominance.dayChange)} · (24h)
                </div>
              </>
            )}
          </div>

          <div className="w-macro-tile">
            <div className="w-ml"><WIcon name="flame" /> On-Chain Bias</div>
            {tiles.onChainBias === null ? (
              <>
                <div className="w-mv w-muted">No data</div>
                <div className="w-mc-chg w-muted">Failed to load</div>
              </>
            ) : (
              <>
                <div className="w-mv">{tiles.onChainBias.pctLong.toFixed(0)}% Long</div>
                <div
                  className={`w-mc-chg ${tiles.onChainBias.pctLong >= 50 ? 'w-bull' : 'w-bear'}`}
                  title="Long/short account ratio"
                >
                  {tiles.onChainBias.pctLong >= 50
                    ? `Longs outweigh shorts ${tiles.onChainBias.ratio.toFixed(2)} : 1`
                    : `Shorts outweigh longs ${(1 / (tiles.onChainBias.ratio || 1)).toFixed(2)} : 1`}
                </div>
              </>
            )}
          </div>

          <div className="w-macro-tile">
            <div className="w-ml"><WIcon name="shield" /> Total Liquidations 24h</div>
            {tiles.liq24h === null ? (
              <>
                <div className="w-mv w-muted">No data</div>
                <div className="w-mc-chg w-muted">Failed to load</div>
              </>
            ) : (
              <>
                <div className="w-mv">{formatUsd(tiles.liq24h.totalUsd)}</div>
                <div className="w-mc-chg w-bear" title="Change vs 7-day average liquidation volume">
                  {formatChange(tiles.liq24h.pctVsAvg7d)} vs avg
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
