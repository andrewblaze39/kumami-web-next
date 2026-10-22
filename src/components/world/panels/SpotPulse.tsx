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
import Link from 'next/link';
import { useMarketEndpoint } from './useMarketEndpoint';
import { WIcon } from './console-ui';
import type { SpotPulsePayload, SpotPulseTile } from '@/lib/market/contracts';

type TF = '4H' | '24H' | '7D';
const TFS: TF[] = ['4H', '24H', '7D'];

const signM = (v: number) => `${v >= 0 ? '+' : '−'}$${Math.abs(v / 1e6).toFixed(1)}M`;
const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const vol = (v: number) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${(v / 1e6).toFixed(0)}M`);
const ago = (iso: string, now: number) => {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  return min === 0 ? 'just now' : `${min} min ago`;
};
const textOn = (t: SpotPulseTile) => (t.verdict === 'BALANCED' ? 'var(--muted-2, var(--muted))' : '#07201b');

// Price counts as UP/DOWN beyond these bands (rules/spotPulse.ts PRICE_BAND_PCT).
const PRICE_BAND: Record<TF, string> = { '4H': '±0.75%', '24H': '±1.5%', '7D': '±4%' };

/** Hover / focus card: the three directions behind the verdict (Andrew, 22 Oct 2026 — replaces the browser tooltip). */
function TileCard({ t, tf, clickable }: { t: SpotPulseTile; tf: TF; clickable: boolean }) {
  const d = t.dirs;
  const row = (label: string, value: string, dir?: string) => (
    <div className="w-sp-pop-row">
      <span>{label}</span>
      <b>{value}{dir && <em className={`w-sp-dir w-sp-dir-${dir.toLowerCase()}`}>{dir}</em>}</b>
    </div>
  );
  return (
    <div className="w-sp-pop" role="tooltip">
      <div className="w-sp-pop-h">
        {t.asset} · {t.insufficient ? 'No data' : t.notEnoughHistory ? 'Not enough history' : t.verdict}
        {t.source === 'top-volume' ? ' · Top volume' : ''}
      </div>
      {t.insufficient ? (
        <div className="w-sp-pop-note">Not enough data for a read right now.</div>
      ) : (
        <>
          {row(`Price ${tf}`, pct(t.priceChange4h), d?.price)}
          {row(`Spot flow ${tf}`, signM(t.spotCvdChange), d?.spot)}
          {row(`Futures flow ${tf}`, signM(t.futCvdChange), d?.fut)}
          <div className="w-sp-pop-note">
            Price counts as a move beyond {PRICE_BAND[tf]}; a flow counts when it&apos;s unusual for this coin (over half its normal swing).
            {t.notEnoughHistory ? ' New listing — left out of the market verdict.' : clickable ? ' Click to open the on-chain view.' : ''}
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ t, tf, onSelect }: { t: SpotPulseTile; tf: TF; onSelect?: (a: string) => void }) {
  const clickable = !!onSelect && !t.insufficient;
  const go = clickable ? () => onSelect!(t.asset) : undefined;
  return (
    <div
      className="w-sp-tile"
      role={clickable ? 'button' : undefined}
      tabIndex={0}
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
      <div className="w-sp-sym">
        {t.asset}
        {t.source === 'top-volume' && <span className="w-sp-src">Top volume</span>}
      </div>
      <div className="w-sp-verdict">{t.insufficient ? 'NO DATA' : t.notEnoughHistory ? 'NOT ENOUGH HISTORY' : t.verdict}</div>
      <div className="w-sp-price">{t.insufficient ? '—' : pct(t.priceChange4h)}</div>
      <TileCard t={t} tf={tf} clickable={clickable} />
    </div>
  );
}

/**
 * variant="plus" (default) — the Spot Pulse tile on On-Chain Insights: 5 anchors.
 * variant="pro" — Spot Pulse Pro, the full tool (/world/pro?tab=spotpulse):
 * core assets + Also Worth Watching coins (empty slots: "Top volume"), 15s cache.
 * One engine and one market-verdict rule for both (Rachelle v1.15 Plus §2.9);
 * the data underneath refreshes every 2 minutes.
 */
export default function SpotPulse({
  onSelectAsset,
  variant = 'plus',
}: {
  onSelectAsset?: (asset: string) => void;
  variant?: 'plus' | 'pro';
}) {
  const [tf, setTf] = useState<TF>('4H');
  const market = useMarketEndpoint<SpotPulsePayload & { extraMode?: 'consistent' | 'building'; historyDays?: number }>(
    `/api/market/spot-pulse?tf=${tf}&view=${variant}`,
  );
  const data = market.data;
  const loading = market.status === 'loading' && !data;

  // "Updated n min ago" + stale chip: re-evaluate on a 30s tick. The shared data
  // refreshes every 2 min, so only > 5 min means refreshes have stopped.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const stale = !!data?.updatedAt && now - new Date(data.updatedAt).getTime() > 300_000;

  return (
    <div className="w-oc-panel">
      <div className="w-oc-ph">
        <span className="w-oc-ttl">
          <WIcon name="spark" /> {variant === 'pro' ? 'Spot Pulse Pro' : 'Spot Pulse'}{' '}
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
            <span className="w-sp-stale" title="Data hasn't refreshed in over 5 minutes — trying to reconnect.">
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
        <b style={{ fontSize: 16, color: 'var(--ink)' }}>
          {loading ? 'Reading spot markets…' : data ? data.marketVerdict : 'No data'}
        </b>
        {data && <span className="w-muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{data.marketSentence}</span>}
        {!loading && !data && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="w-muted" style={{ fontSize: 12.5 }}>Couldn&apos;t load Spot Pulse right now.</span>
            <button type="button" className="w-btn w-btn-ghost w-btn-sm" onClick={market.refetch}>Retry</button>
          </span>
        )}
      </div>

      <div className="w-oc-pb">
        {/* Tile grid */}
        {loading ? (
          <div className="w-sp-grid">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="w-sp-tile w-sp-skeleton" />)}
          </div>
        ) : !data || data.tiles.length === 0 ? (
          <p className="w-panel-empty">No Spot Pulse data available.</p>
        ) : (
          <div className="w-sp-grid">
            {data.tiles.map((t) => <Tile key={t.asset} t={t} tf={tf} onSelect={onSelectAsset} />)}
          </div>
        )}

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
            {data.footer.totalSpotVol24h != null && (
              <span>· 24h spot volume <b>{vol(data.footer.totalSpotVol24h)}</b></span>
            )}
            <span>· {data.footer.divergenceCount} divergence signal{data.footer.divergenceCount === 1 ? '' : 's'}</span>
            <span>· Updated {ago(data.updatedAt, now)}</span>
            {variant === 'pro' ? (
              <span className="w-delay-note" style={{ marginLeft: 'auto' }}>
                <WIcon name="clock" /> {data.timeframe} window · row 2 = Also Worth Watching
                {data.tiles.some((t) => t.source === 'top-volume') ? ' + Top volume' : ''}
              </span>
            ) : (
              <span className="w-delay-note" style={{ marginLeft: 'auto' }}>
                <WIcon name="clock" /> {data.timeframe} window ·{' '}
                <Link href="/world/pro?tab=spotpulse">Unlock Spot Pulse Pro →</Link>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
