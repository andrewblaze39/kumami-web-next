'use client';

import type { CSSProperties } from 'react';
import type { ConsolePayload } from '@/lib/market/contracts';
import { formatPrice, formatChange } from './format';
import { CoinBadge } from './console-ui';

type Props = {
  chips: ConsolePayload['regimeChips'];
  loading?: boolean;
};

// Reference: --rc set per regime — bull / bear / neutral (#f0b65e)
const REGIME_RC: Record<string, string> = {
  Bullish: 'var(--bull)',
  Bearish: 'var(--bear)',
  Neutral: '#f0b65e',
};

export default function RegimeChips({ chips, loading }: Props) {
  if (loading) {
    return (
      <div className="w-regime-row" aria-busy="true">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="w-regime-chip w-panel-skeleton w-regime-chip-skeleton" />
        ))}
      </div>
    );
  }

  if (chips.length === 0) {
    return (
      <div className="w-regime-row w-regime-empty" role="status">
        <span className="w-muted">No regime data</span>
      </div>
    );
  }

  return (
    <div className="w-regime-row" role="list" aria-label="Asset regime overview" data-tour="regime">
      {chips.map(chip => {
        return (
          <div
            key={chip.asset}
            className="w-regime-chip"
            style={{ '--rc': REGIME_RC[chip.regime] ?? '#f0b65e' } as CSSProperties}
            role="listitem"
            aria-label={
              chip.price !== null && chip.change24h !== null
                ? `${chip.asset}: ${chip.regime}, price $${formatPrice(chip.price)}, 24h ${formatChange(chip.change24h)}, AI confidence ${chip.confidence.toFixed(2)}`
                : `${chip.asset}: ${chip.regime}, price data unavailable`
            }
          >
            <div className="w-rc-top">
              <span className="w-sym">
                <CoinBadge sym={chip.asset} size={24} />
                {chip.asset}
              </span>
              {chip.change24h !== null ? (
                <span
                  className={`w-chg ${chip.change24h >= 0 ? 'w-bull' : 'w-bear'}`}
                  title="24h price change"
                >
                  {formatChange(chip.change24h)}
                </span>
              ) : (
                <span className="w-chg w-muted">—</span>
              )}
            </div>
            <div className="w-reg-lbl">{chip.regime}</div>
            <div className="w-reg-conf">
              {chip.price !== null
                ? <>AI conf {chip.confidence.toFixed(2)} · ${formatPrice(chip.price)}</>
                : <span className="w-muted">No price data</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
