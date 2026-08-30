'use client';

/**
 * Spot Pulse — a grid of asset tiles showing spot-vs-futures behaviour, a
 * market-wide verdict, divergence alert cards, and footer stats. Replaces the
 * tier-locked liquidation-heatmap slot on the On-Chain page.
 *
 * Verdict logic + exact colours come from the server (rules/spotPulse.ts); this
 * only renders. Consumes /api/market/spot-pulse via useMarketEndpoint.
 */

import { useMarketEndpoint } from './useMarketEndpoint';
import { WIcon } from './console-ui';
import type { SpotPulsePayload, SpotPulseTile } from '@/lib/market/contracts';

const signM = (v: number) => `${v >= 0 ? '+' : '−'}$${Math.abs(v / 1e6).toFixed(1)}M`;
const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const textOn = (t: SpotPulseTile) => (t.verdict === 'BALANCED' ? 'var(--muted-2, var(--muted))' : '#07201b');

function Tile({ t }: { t: SpotPulseTile }) {
  const tip = `${t.asset} · ${t.verdict}\nSpot CVD 4H: ${signM(t.spotCvdChange)}\nFutures CVD 4H: ${signM(t.futCvdChange)}\nPrice 4H: ${pct(t.priceChange4h)}${t.insufficient ? '\ninsufficient data' : ''}`;
  return (
    <div
      className="w-sp-tile"
      title={tip}
      style={{
        background: t.color,
        color: textOn(t),
        borderColor: t.glow ? '#5ee9a8' : 'transparent',
        boxShadow: t.glow ? '0 0 16px rgba(94,233,168,0.5)' : undefined,
      }}
    >
      <div className="w-sp-sym">{t.asset}</div>
      <div className="w-sp-verdict">{t.insufficient ? 'NO DATA' : t.verdict}</div>
      <div className="w-sp-price">{t.insufficient ? '—' : pct(t.priceChange4h)}</div>
    </div>
  );
}

export default function SpotPulse() {
  const market = useMarketEndpoint<SpotPulsePayload>('/api/market/spot-pulse');
  const data = market.data;
  const loading = market.status === 'loading' && !data;

  return (
    <div className="w-oc-panel">
      <div className="w-oc-ph">
        <span className="w-oc-ttl">
          <WIcon name="spark" /> Spot Pulse{' '}
          <span
            className="w-oc-q"
            tabIndex={0}
            title="Where is real money moving? Each tile compares spot buying/selling (real capital) against futures (leverage) for that asset. Green = genuine spot demand; red = spot selling into a leveraged rally; amber = speculative, likely to fade."
          >
            ?
          </span>
          <span className="w-oc-ph-sub">Real money vs leverage · spot vs futures</span>
        </span>
        <span className="w-oc-ph-r">
          <span className="w-oc-chip">4H</span>
        </span>
      </div>

      {/* Market-wide verdict + one-liner */}
      <div className="w-oc-wi-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
        <b style={{ fontSize: 16, color: 'var(--ink)' }}>{loading ? 'Reading spot markets…' : data?.marketVerdict}</b>
        {data && <span className="w-muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{data.marketSentence}</span>}
      </div>

      <div className="w-oc-pb">
        {/* Tile grid */}
        <div className="w-sp-grid">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="w-sp-tile w-sp-skeleton" />)
            : (data?.tiles ?? []).map((t) => <Tile key={t.asset} t={t} />)}
        </div>

        {/* Divergence alert cards */}
        {data && data.alerts.length > 0 && (
          <div className="w-sp-alerts">
            {data.alerts.map((a, i) => (
              <div key={`${a.asset}-${i}`} className="w-sp-alert" style={{ borderLeftColor: a.color }}>
                <div className="w-sp-alert-h" style={{ color: a.color }}>
                  {a.asset} · {a.verdict}
                </div>
                <div className="w-sp-alert-l1">{a.line1}</div>
                <div className="w-sp-alert-l2">{a.line2}</div>
                {a.confirm && <div className="w-sp-alert-confirm">{a.confirm}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Footer stats */}
        {data && (
          <div className="w-sp-footer">
            <span>
              Net spot flow <b className={data.footer.netSpotFlow >= 0 ? 'up' : 'down'}>{signM(data.footer.netSpotFlow)}</b>{' '}
              ({data.footer.netSpotFlow >= 0 ? 'net buying' : 'net selling'})
            </span>
            <span>· {data.footer.divergenceCount} divergence signal{data.footer.divergenceCount === 1 ? '' : 's'}</span>
            <span className="w-delay-note" style={{ marginLeft: 'auto' }}>
              <WIcon name="clock" /> 4H window · 15-min delayed
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
