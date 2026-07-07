'use client';

import type { ConsolePayload } from '@/lib/market/contracts';
import { formatPrice, formatChange, formatConfidence } from './format';

type Props = {
  chips: ConsolePayload['regimeChips'];
  loading?: boolean;
};

const REGIME_CLASS: Record<string, string> = {
  Bullish: 'w-regime-bullish',
  Neutral: 'w-regime-neutral',
  Bearish: 'w-regime-bearish',
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

  return (
    <div className="w-regime-row" role="list" aria-label="Asset regime overview">
      {chips.map(chip => (
        <div
          key={chip.asset}
          className={`w-regime-chip ${REGIME_CLASS[chip.regime] ?? 'w-regime-neutral'}`}
          role="listitem"
          aria-label={`${chip.asset}: ${chip.regime}, price ${formatPrice(chip.price)}, 24h ${formatChange(chip.change24h)}, confidence ${formatConfidence(chip.confidence)}`}
        >
          <div className="w-regime-chip-top">
            <span className="w-regime-asset">{chip.asset}</span>
            <span
              className={`w-regime-badge w-regime-badge-${chip.regime.toLowerCase()}`}
              title={`Regime: ${chip.regime} — confidence ${formatConfidence(chip.confidence)}`}
            >
              {chip.regime}
            </span>
          </div>
          <div className="w-regime-chip-bottom">
            <span className="w-regime-price" title={`Current price: $${formatPrice(chip.price)}`}>
              ${formatPrice(chip.price)}
            </span>
            <span
              className={`w-regime-change ${chip.change24h >= 0 ? 'w-bull' : 'w-bear'}`}
              title="24h price change"
            >
              {formatChange(chip.change24h)}
            </span>
          </div>
          <div className="w-regime-conf-bar" aria-hidden="true">
            <div
              className="w-regime-conf-fill"
              style={{ width: `${Math.round(chip.confidence * 100)}%` }}
              title={`Confidence: ${formatConfidence(chip.confidence)}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
