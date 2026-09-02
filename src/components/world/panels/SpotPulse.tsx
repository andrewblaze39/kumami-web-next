'use client';

/**
 * Spot Pulse — a grid of asset tiles showing spot-vs-futures behaviour, a
 * market-wide verdict, divergence alert cards, and footer stats. Replaces the
 * tier-locked liquidation-heatmap slot on the On-Chain page.
 *
 * Verdict logic + exact colours come from the server (rules/spotPulse.ts); this
 * only renders. Consumes /api/market/spot-pulse via useMarketEndpoint.
 *
 * Controls (§7/§8/§9): timeframe toggle (4H/24H/7D), click-through to a coin's
 * On-Chain view (onSelectAsset), and a "Data delayed" chip when the payload
 * hasn't refreshed in over 2 minutes.
 */

import { useEffect, useState } from 'react';
import { useMarketEndpoint } from './useMarketEndpoint';
import { WIcon } from './console-ui';
import type { SpotPulsePayload, SpotPulseTile } from '@/lib/market/contracts';

type TF = '4H' | '24H' | '7D';
const TFS: TF[] = ['4H', '24H', '7D'];

const signM = (v: number) => `${v >= 0 ? '+' : '−'}$${Math.abs(v / 1e6).toFixed(1)}M`;
const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const textOn = (t: SpotPulseTile) => (t.verdict === 'BALANCED' ? 'var(--muted-2, var(--muted))' : '#07201b');

function Tile({ t, tf, onSelect }: { t: SpotPulseTile; tf: TF; onSelect?: (a: string) => void }) {
  const clickable = !!onSelect && !t.insufficient;
  const go = clickable ? () => onSelect!(t.asset) : undefined;
  const tip = `${t.asset} · ${t.verdict}\nSpot CVD ${tf}: ${signM(t.spotCvdChange)}\nFutures CVD ${tf}: ${signM(t.futCvdChange)}\nPrice ${tf}: ${pct(t.priceChange4h)}${t.insufficient ? '\ninsufficient data' : clickable ? '\nClick to open on-chain view' : ''}`;
  return (
    <div
      className="w-sp-tile"
      title={tip}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={go}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                go!();
              }
            }
          : undefined
      }
      style={{
        background: t.color,
        color: textOn(t),
        borderColor: t.glow ? '#5ee9a8' : 'transparent',
        boxShadow: t.glow ? '0 0 16px rgba(94,233,168,0.5)' : undefined,
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <div className="w-sp-sym">{t.asset}</div>
      <div className="w-sp-verdict">{t.insufficient ? 'NO DATA' : t.verdict}</div>
      <div className="w-sp-price">{t.insufficient ? '—' : pct(t.priceChange4h)}</div>
    </div>
  );
}

export default function SpotPulse({ onSelectAsset }: { onSelectAsset?: (asset: string) => void }) {
  const [tf, setTf] = useState<TF>('4H');
  const market = useMarketEndpoint<SpotPulsePayload>(`/api/market/spot-pulse?tf=${tf}`);
  const data = market.data;
  const loading = market.status === 'loading' && !data;

  // Stale-data chip (§9): re-evaluate on a 30s tick so it appears if refreshes stop.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const stale = !!data?.updatedAt && now - new Date(data.updatedAt).getTime() > 120_000;

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
        <span className="w-oc-ph-r" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {stale && (
            <span className="w-sp-stale" title="Live data hasn't refreshed in over 2 minutes — trying to reconnect.">
              <WIcon name="clock" /> Data delayed
            </span>
          )}
          <span className="w-mini-toggle">
            {TFS.map((t) => (
              <button key={t} className={tf === t ? 'on' : ''} onClick={() => setTf(t)}>
                {t}
              </button>
            ))}
          </span>
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
            : (data?.tiles ?? []).map((t) => <Tile key={t.asset} t={t} tf={tf} onSelect={onSelectAsset} />)}
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
            {data.footer.spotNetflow != null && (
              <span>
                · Spot netflow <b className={data.footer.spotNetflow >= 0 ? 'up' : 'down'}>{signM(data.footer.spotNetflow)}</b>{' '}
                ({data.footer.spotNetflow >= 0 ? 'out of exchanges' : 'into exchanges'})
              </span>
            )}
            <span>· {data.footer.divergenceCount} divergence signal{data.footer.divergenceCount === 1 ? '' : 's'}</span>
            <span className="w-delay-note" style={{ marginLeft: 'auto' }}>
              <WIcon name="clock" /> {data.timeframe} window · 15-min delayed
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
