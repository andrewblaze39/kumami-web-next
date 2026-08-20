'use client';

/**
 * /world/onchain — On-Chain Insight (Market Structure).
 *
 * Live: consumes /api/market/onchain?asset=&range= (OnChainPayload) and maps the
 * 9 live panels (funding, liquidations, netflow, long/short, CVD, premium, ETF,
 * OI, stablecoin) into the reference chart UI. The Liquidation Heatmap is
 * tier-locked on CoinGlass → shown blurred with a "coming soon" veil.
 *
 * Visual shell (classes, layout, tooltips) is unchanged from the reference port;
 * only the data source is now live.
 */

import { useState, type ReactNode } from 'react';
import { WIcon, coinC, type ConsoleIconName } from '@/components/world/panels/console-ui';
import {
  OcDual,
  OcBars,
  OcArea,
  type OcDivType,
} from '@/components/world/panels/onchain-charts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { formatUsd } from '@/components/world/panels/format';
import type { OnChainPayload, Verdict, MetricPanelKey } from '@/lib/market/contracts';

/* ------------------------------------------------------------------ */
/* Tooltips (unchanged copy)                                           */
/* ------------------------------------------------------------------ */

const TIP_FUNDING =
  'The fee traders pay to keep leveraged bets open. When it’s high, too many people are on the same side — and the market often snaps back. Derived from open-interest-weighted perpetual funding aggregated across major exchanges.';
const TIP_LIQ =
  'Leveraged positions force-closed in the last 24 hours. A big flush of longs often clears the way for a bounce; squeezed shorts often mark a top. Totalled from forced-liquidation events across major exchanges.';
const TIP_NETFLOW =
  'Coins leaving exchanges = people holding (bullish). Coins arriving = people preparing to sell (bearish). Measured from the change in coin balances held on major exchange wallets.';
const TIP_LS =
  'How crowded the bet is. When the crowd leans heavily one way — and the pros lean the other — pay attention. Based on the ratio of long vs short trader accounts across major exchanges.';

/* ------------------------------------------------------------------ */
/* Verdict colour → reference tag / world-icon class keys              */
/* ------------------------------------------------------------------ */

const TAG_K: Record<Verdict['color'], string> = {
  green: 'green',
  'grey-green': 'ggreen',
  grey: 'neutral',
  amber: 'amber',
  'grey-red': 'gred',
  red: 'red',
};

const WI_K: Record<Verdict['color'], string> = {
  green: 'bull',
  'grey-green': 'bull',
  grey: 'neutral',
  amber: 'warn',
  'grey-red': 'bear',
  red: 'bear',
};

function divFromColor(c: Verdict['color']): OcDivType {
  if (c === 'green' || c === 'grey-green') return 'acc';
  if (c === 'red' || c === 'grey-red') return 'dist';
  return 'none';
}

type Tag = { t: string; k: string };

/* Assets supported by /api/market/onchain */
const OC_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX'] as const;
type OcAsset = (typeof OC_ASSETS)[number];

const RANGES = ['24H', '7D', '30D'] as const;
type OcRange = (typeof RANGES)[number];
const RANGE_API: Record<OcRange, '24h' | '7d' | '30d'> = { '24H': '24h', '7D': '7d', '30D': '30d' };

/* ------------------------------------------------------------------ */
/* Small render helpers (reference ocQ / ocTag / ocWI)                 */
/* ------------------------------------------------------------------ */

function OcQ({ tip }: { tip: string }) {
  return (
    <span className="w-oc-q" tabIndex={0} title={tip}>
      ?
    </span>
  );
}

function OcTag({ tag }: { tag: Tag | null | undefined }) {
  if (!tag) return null;
  return <span className={`w-oc-tag ${tag.k}`}>{tag.t}</span>;
}

const WI_IC: Record<string, ConsoleIconName> = {
  bull: 'flame',
  bear: 'bolt',
  warn: 'shield',
  neutral: 'clock',
};

function OcWI({ wi }: { wi: Tag }) {
  return (
    <span className={`w-oc-wi ${wi.k}`}>
      <WIcon name={WI_IC[wi.k] ?? 'clock'} /> {wi.t}
    </span>
  );
}

function Coin({ sym, bg }: { sym: string; bg?: string }) {
  return (
    <span className="w-coin" style={{ background: bg ?? coinC(sym) }}>
      {sym[0]}
    </span>
  );
}

/** Chart slot: renders the chart only when real data exists, else an honest "No data yet". */
function ChartArea({ has, children }: { has: boolean; children: ReactNode }) {
  if (!has) {
    return (
      <div
        className="w-oc-chart"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12.5 }}
      >
        No data yet
      </div>
    );
  }
  return <div className="w-oc-chart">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Live payload → view helpers                                         */
/* ------------------------------------------------------------------ */

type P = OnChainPayload['panels'][MetricPanelKey];

const svals = (panel: P | undefined, which: 'series' | 'series2'): number[] =>
  (panel?.[which] ?? []).map((pt) => pt.v);

const verdictTag = (panel: P | undefined): Tag =>
  panel ? { t: panel.verdict.label, k: TAG_K[panel.verdict.color] } : { t: '—', k: 'neutral' };

const verdictWI = (panel: P | undefined): Tag =>
  panel ? { t: panel.verdict.label, k: WI_K[panel.verdict.color] } : { t: 'Loading…', k: 'neutral' };

const exNum = (panel: P | undefined, key: string): number => {
  const v = panel?.extra?.[key];
  return typeof v === 'number' ? v : 0;
};

const signPct = (n: number, dp = 2) => `${n >= 0 ? '+' : ''}${n.toFixed(dp)}%`;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function OnChainPage() {
  const [asset, setAsset] = useState<OcAsset>('BTC');
  const [range, setRange] = useState<OcRange>('24H');
  const [heatTf, setHeatTf] = useState<OcRange>('24H');
  const [cvdSrc, setCvdSrc] = useState<'Futures' | 'Spot'>('Futures');
  const [more, setMore] = useState(false);

  const a = asset;

  const market = useMarketEndpoint<OnChainPayload>(
    `/api/market/onchain?asset=${a}&range=${RANGE_API[range]}`,
  );
  const loading = market.status === 'loading' && !market.data;
  const P = market.data?.panels;

  /* Real series only — an empty series renders an honest "No data yet" box, never a synthetic shape. */
  const priceS = svals(P?.oi, 'series2');
  const cvdS = cvdSrc === 'Futures' ? svals(P?.cvd, 'series') : svals(P?.cvd, 'series2');
  const premS = svals(P?.premium, 'series');
  const oiS = svals(P?.oi, 'series');
  const etfBars = svals(P?.etf, 'series');
  const etfPrice = svals(P?.etf, 'series2');
  const stbS = svals(P?.stablecoin, 'series');

  /* Panel-derived display values */
  const fundingRate = P ? signPct(exNum(P.funding, 'currentRatePct'), 4) : '—';

  const liqTotal = exNum(P?.liquidations, 'totalUsd');
  const liqLongPct = exNum(P?.liquidations, 'longPct') / 100;
  const liqLongs = formatUsd(liqTotal * liqLongPct);
  const liqShorts = formatUsd(liqTotal * (1 - liqLongPct));

  const netUsd = exNum(P?.netflow, 'netUsd');
  const netDir: 'in' | 'out' = netUsd >= 0 ? 'out' : 'in';

  const glsPct = exNum(P?.longshort, 'globalPctLong');
  const topPct = exNum(P?.longshort, 'topTraderPctLong');
  const lsDiv = P?.longshort?.tags?.[0]
    ? { t: P.longshort.tags[0].label, k: TAG_K[P.longshort.tags[0].color] }
    : null;

  const premPct = exNum(P?.premium, 'premiumPct');
  const premNeg = premPct < 0;
  const premAvg7 = premS.length ? signPct(premS.reduce((s, v) => s + v, 0) / premS.length, 3) : '—';
  const premTrend =
    P?.premium?.tags?.some((t) => /Fading/.test(t.label)) ? 'Falling'
    : P?.premium?.tags?.some((t) => /Returning|Demand/.test(t.label)) ? 'Rising'
    : 'Flat';

  const oiLast = oiS.length ? oiS[oiS.length - 1] : 0;
  const oiFirst = oiS.length ? oiS[0] : 0;
  const oiChgPct = oiFirst ? ((oiLast - oiFirst) / oiFirst) * 100 : 0;

  const etfNet7 = exNum(P?.etf, 'net7dUsd');
  const etfToday = etfBars.length ? etfBars[etfBars.length - 1] : 0;

  const stbLast = stbS.length ? stbS[stbS.length - 1] : 0;
  const stbChg30 = exNum(P?.stablecoin, 'change30dPct');

  const cvdLast = cvdS.length ? cvdS[cvdS.length - 1] : 0;
  const cvdDivType = divFromColor(P?.cvd?.verdict.color ?? 'grey');
  const oiDivType = divFromColor(P?.oi?.verdict.color ?? 'grey');

  return (
    <div className="w-content-inner w-onchain">
      {/* ---- Header ---- */}
      <div className="w-oc-head">
        <div className="w-oc-head-top">
          <div>
            <div className="w-ptag">On-Chain Insight</div>
            <h1>
              <WIcon name="spark" /> Market Structure
            </h1>
            <p className="w-oc-sub">
              See what&apos;s happening beneath the price — where money is moving, who&apos;s
              buying, and how risky the market is right now.
            </p>
          </div>
          <div className="w-oc-controls">
            <div className="w-oc-asset-tabs">
              {OC_ASSETS.map((s) => (
                <button key={s} className={a === s ? 'on' : ''} onClick={() => setAsset(s)}>
                  <Coin sym={s} />
                  {s}
                </button>
              ))}
            </div>
            <span className="w-range-toggle">
              {RANGES.map((r) => (
                <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>
                  {r}
                </button>
              ))}
            </span>
            <span className="w-oc-delay">
              <WIcon name="clock" /> <b>Data delayed 15 min</b> · Upgrade to Pro for real-time
            </span>
          </div>
        </div>
      </div>

      {/* ---- Tier 1 tiles ---- */}
      <div className="w-oc-tiles">
        <div className="w-oc-tile">
          <div className="w-oc-tile-h">
            <span className="w-oc-tl">
              <WIcon name="spark" /> Funding Rate
            </span>
            <OcQ tip={TIP_FUNDING} />
          </div>
          <div className="w-oc-tv">{fundingRate}</div>
          <div className="w-oc-tags">
            <OcTag tag={verdictTag(P?.funding)} />
          </div>
          <div className="w-oc-support">
            OI-weighted · Every 8H
          </div>
        </div>

        <div className="w-oc-tile">
          <div className="w-oc-tile-h">
            <span className="w-oc-tl">
              <WIcon name="bolt" /> Liquidations 24H
            </span>
            <OcQ tip={TIP_LIQ} />
          </div>
          <div className="w-oc-tv">{loading ? '—' : formatUsd(liqTotal)}</div>
          <div className="w-oc-tags">
            <OcTag tag={verdictTag(P?.liquidations)} />
          </div>
          <div className="w-oc-support">
            <span className="w-oc-split">
              <WIcon name="chevD" />
              <span className="down">Longs {loading ? '—' : liqLongs}</span>
            </span>
            <span className="w-oc-split" style={{ transform: 'none' }}>
              <span className="up">Shorts {loading ? '—' : liqShorts}</span>
            </span>
          </div>
        </div>

        <div className="w-oc-tile">
          <div className="w-oc-tile-h">
            <span className="w-oc-tl">
              <WIcon name="layers" /> Exchange Netflow
            </span>
            <OcQ tip={TIP_NETFLOW} />
          </div>
          <div
            className="w-oc-tv"
            style={{ color: netDir === 'out' ? 'var(--bull)' : 'var(--bear)' }}
          >
            {loading ? '—' : formatUsd(Math.abs(netUsd))} <span className="sub-unit">{netDir}</span>
          </div>
          <div className="w-oc-tags">
            <OcTag tag={verdictTag(P?.netflow)} />
          </div>
          <div className="w-oc-support">{netDir === 'out' ? 'Coins leaving exchanges' : 'Coins arriving to exchanges'} · {range}</div>
        </div>

        <div className="w-oc-tile">
          <div className="w-oc-tile-h">
            <span className="w-oc-tl">
              <WIcon name="users" /> Long / Short Ratio
            </span>
            <OcQ tip={TIP_LS} />
          </div>
          <div className="w-oc-tv">{loading ? '—' : `${glsPct.toFixed(0)}% Long`}</div>
          <div className="w-oc-tags">
            <OcTag tag={verdictTag(P?.longshort)} />
            <OcTag tag={lsDiv} />
          </div>
          <div className={`w-oc-support${lsDiv ? ' warn' : ''}`}>Top traders {loading ? '—' : `${topPct.toFixed(0)}%`} long</div>
        </div>
      </div>

      {/* ---- Liquidation heatmap (tier-locked → coming soon) ---- */}
      <div style={{ marginBottom: 16 }}>
        <div className="w-oc-panel">
          <div className="w-oc-ph">
            <span className="w-oc-ttl">
              <WIcon name="layers" /> Liquidation Heatmap{' '}
              <OcQ tip="Price levels where forced sell-offs would trigger. Price often gets pulled toward these zones like a magnet." />
              <span className="w-oc-ph-sub">Clustered liquidation levels · ±20% of price</span>
            </span>
            <span className="w-oc-ph-r">
              <span className="w-oc-chip">
                <Coin sym={a} />
                {a}
              </span>
              <span className="w-mini-toggle">
                {RANGES.map((t) => (
                  <button key={t} className={heatTf === t ? 'on' : ''} onClick={() => setHeatTf(t)}>
                    {t}
                  </button>
                ))}
              </span>
            </span>
          </div>
          <div className="w-oc-pb">
            {/* Honest coming-soon state — no placeholder data rendered */}
            <div
              style={{
                minHeight: 180, borderRadius: 12, border: '1px dashed var(--adv-border-2)',
                background: 'var(--adv-surface-2)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', padding: 24,
              }}
            >
              <span className="w-oc-wi neutral" style={{ fontSize: 13 }}>
                <WIcon name="clock" /> Liquidation Heatmap — coming soon
              </span>
              <span className="w-muted" style={{ fontSize: 12, maxWidth: 440 }}>
                Cluster-level liquidation mapping isn&apos;t available on the current data plan yet.
                It will switch on automatically once enabled.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Tier 2 row: CVD / Premium / ETF ---- */}
      <div className="w-oc-brow">
        {/* CVD */}
        <div className="w-oc-panel">
          <div className="w-oc-ph">
            <span className="w-oc-ttl">
              <WIcon name="spark" /> Buy vs Sell Pressure{' '}
              <OcQ tip="Whether a move is driven by real buyers or running on empty. Real buying lasts; hollow rallies reverse. Built from aggregated taker buy vs sell volume across spot and futures venues." />
              <span className="w-oc-ph-sub">Net aggressive buying vs selling · CVD</span>
            </span>
            <span className="w-oc-ph-r">
              <span className="w-mini-toggle">
                {(['Futures', 'Spot'] as const).map((t) => (
                  <button key={t} className={cvdSrc === t ? 'on' : ''} onClick={() => setCvdSrc(t)}>
                    {t}
                  </button>
                ))}
              </span>
            </span>
          </div>
          <div className="w-oc-wi-row">
            <OcWI wi={verdictWI(P?.cvd)} />
          </div>
          <div className="w-oc-pb">
            <ChartArea has={cvdS.length > 0}>
              <OcDual
                a={cvdS}
                b={priceS}
                divType={cvdDivType}
                primary={cvdDivType === 'dist' ? '#ff6b81' : 'var(--accent)'}
              />
            </ChartArea>
            <div className="w-oc-fstats">
              <span className="w-oc-fstat">
                {cvdSrc} CVD <b className={cvdLast >= 0 ? 'up' : 'down'}>{formatUsd(cvdLast)}</b>
              </span>
              <span className="w-oc-fstat">
                Trend <b className={cvdLast >= 0 ? 'up' : 'down'}>{cvdLast >= 0 ? 'Rising' : 'Falling'}</b>
              </span>
            </div>
          </div>
        </div>

        {/* Coinbase premium */}
        <div className="w-oc-panel">
          <div className="w-oc-ph">
            <span className="w-oc-ttl">
              <WIcon name="building" /> US Demand Premium{' '}
              <OcQ tip="The price gap between Coinbase (US money) and offshore exchanges. US-led moves tend to be steadier and last longer." />
              <span className="w-oc-ph-sub">US vs offshore price gap · Coinbase premium (BTC)</span>
            </span>
            <span className="w-oc-ph-r">
              <span className="w-oc-headline" style={{ margin: 0 }}>
                <b style={{ fontSize: 20, color: premNeg ? 'var(--bear)' : 'var(--accent)' }}>
                  {loading ? '—' : signPct(premPct, 3)}
                </b>
              </span>
            </span>
          </div>
          <div className="w-oc-wi-row">
            <OcWI wi={verdictWI(P?.premium)} />
          </div>
          <div className="w-oc-pb">
            <ChartArea has={premS.length > 0}>
              <OcArea series={premS} color={premNeg ? '#ff6b81' : 'var(--accent)'} zeroVal={0} />
            </ChartArea>
            <div className="w-oc-fstats">
              <span className="w-oc-fstat">
                Avg <b>{premAvg7}</b>
              </span>
              <span className="w-oc-fstat">
                Trend <b>{premTrend}</b>
              </span>
            </div>
          </div>
        </div>

        {/* ETF flow */}
        <div className="w-oc-panel">
          <div className="w-oc-ph">
            <span className="w-oc-ttl">
              <WIcon name="layers" /> ETF Flow{' '}
              <OcQ tip="Daily buying and selling through Bitcoin & Ethereum ETFs — the cleanest read on what Wall Street is doing." />
              <span className="w-oc-ph-sub">Daily institutional flow</span>
            </span>
          </div>
          <div className="w-oc-wi-row">
            <OcWI wi={verdictWI(P?.etf)} />
          </div>
          <div className="w-oc-pb">
            <div className="w-oc-headline">
              <b>{loading ? '—' : formatUsd(etfNet7)}</b>
              <span className="hl-sub">7D net flow</span>
            </div>
            <ChartArea has={etfBars.length > 0}>
              <OcBars vals={etfBars} price={etfPrice} />
            </ChartArea>
            <div className="w-oc-note">30D view · best for ETF analysis</div>
            <div className="w-oc-fstats">
              <span className="w-oc-fstat">
                Today <b className={etfToday >= 0 ? 'up' : 'down'}>{formatUsd(etfToday)}</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Show more / tier 3 ---- */}
      <button className={`w-oc-showmore${more ? ' open' : ''}`} onClick={() => setMore((v) => !v)}>
        {more ? 'Show fewer metrics' : 'Show more metrics'} <WIcon name="chevD" />
      </button>

      {more && (
        <div className="w-oc-tier3">
          {/* Open interest trend */}
          <div className="w-oc-panel">
            <div className="w-oc-ph">
              <span className="w-oc-ttl">
                <WIcon name="flame" /> Open Interest Trend{' '}
                <OcQ tip="Total leveraged bets in the market. Rising with price = healthy trend. Rising without price = pressure building. Total open perpetual and futures positions aggregated across exchanges." />
                <span className="w-oc-ph-sub">Leverage in the system</span>
              </span>
            </div>
            <div className="w-oc-wi-row">
              <OcWI wi={verdictWI(P?.oi)} />
            </div>
            <div className="w-oc-pb">
              <div className="w-oc-headline">
                <b>{loading ? '—' : formatUsd(oiLast)}</b>
                <span className="hl-sub">
                  total OI ·{' '}
                  <span className={oiChgPct < 0 ? 'down' : 'up'}>
                    {signPct(oiChgPct, 1)} {range}
                  </span>
                </span>
              </div>
              <ChartArea has={oiS.length > 0}>
                <OcDual a={oiS} b={priceS} divType={oiDivType} primary="var(--accent)" />
              </ChartArea>
            </div>
          </div>

          {/* Stablecoin supply */}
          <div className="w-oc-panel">
            <div className="w-oc-ph">
              <span className="w-oc-ttl">
                <WIcon name="shield" /> Stablecoin Supply{' '}
                <OcQ tip="Cash sitting on the sidelines. When it grows, there’s more dry powder waiting to buy in. Tracked as the combined circulating supply of major stablecoins." />
                <span className="w-oc-ph-sub">Dry powder · total cap</span>
              </span>
            </div>
            <div className="w-oc-wi-row">
              <OcWI wi={verdictWI(P?.stablecoin)} />
            </div>
            <div className="w-oc-pb">
              <div className="w-oc-headline">
                <b>{loading ? '—' : formatUsd(stbLast)}</b>
                <span className="hl-sub">
                  total cap · <span className={stbChg30 < 0 ? 'down' : 'up'}>30D {signPct(stbChg30, 1)}</span>
                </span>
              </div>
              <ChartArea has={stbS.length > 0}>
                <OcArea series={stbS} color="var(--accent)" />
              </ChartArea>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
