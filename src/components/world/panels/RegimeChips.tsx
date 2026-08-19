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
    <div className="w-regime-row" role="list" aria-label="Asset regime overview">
      {chips.map(chip => {
        // SPX has no CoinGlass/macro source yet → coming-soon treatment.
        const comingSoon = chip.asset === 'SPX' && chip.price === 0;
        if (comingSoon) {
          return (
            <div
              key={chip.asset}
              className="w-regime-chip w-regime-soon"
              style={{ '--rc': '#8a94a6' } as CSSProperties}
              role="listitem"
              aria-label={`${chip.asset}: coming soon`}
            >
              <div className="w-rc-top">
                <span className="w-sym"><CoinBadge sym={chip.asset} size={17} />{chip.asset}</span>
              </div>
              <div className="w-reg-lbl w-muted">Coming soon</div>
              <div className="w-reg-conf w-muted">S&amp;P 500 macro feed</div>
            </div>
          );
        }
        return (
          <div
            key={chip.asset}
            className="w-regime-chip"
            style={{ '--rc': REGIME_RC[chip.regime] ?? '#f0b65e' } as CSSProperties}
            role="listitem"
            aria-label={`${chip.asset}: ${chip.regime}, price $${formatPrice(chip.price)}, 24h ${formatChange(chip.change24h)}, AI confidence ${chip.confidence.toFixed(2)}`}
          >
            <div className="w-rc-top">
              <span className="w-sym">
                <CoinBadge sym={chip.asset} size={17} />
                {chip.asset}
              </span>
              <span
                className={`w-chg ${chip.change24h >= 0 ? 'w-bull' : 'w-bear'}`}
                title="24h price change"
              >
                {formatChange(chip.change24h)}
              </span>
            </div>
            <div className="w-reg-lbl">{chip.regime}</div>
            <div className="w-reg-conf">
              AI conf {chip.confidence.toFixed(2)} · ${formatPrice(chip.price)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
