'use client';

/**
 * /world/onchain — On-Chain Insight (Market Structure).
 *
 * Live: consumes /api/market/onchain?asset=&range= (OnChainPayload) and maps the
 * 9 live panels (funding, liquidations, netflow, long/short, CVD, premium, ETF,
 * OI, stablecoin) into the reference chart UI. The tier-locked Liquidation
 * Heatmap slot is replaced by the live Whale Position Tracker (Hyperliquid).
 *
 * Numeric values fall back to '—' (never a misleading $0) when a metric has no data.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { WIcon, coinC, type ConsoleIconName } from '@/components/world/panels/console-ui';
import {
  OcDual,
  OcBars,
  OcArea,
  type OcDivType,
} from '@/components/world/panels/onchain-charts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { formatUsd } from '@/components/world/panels/format';
import SpotPulse from '@/components/world/panels/SpotPulse';
import type { OnChainPayload, Verdict, MetricPanelKey } from '@/lib/market/contracts';
import ProductTour, { type TourStep } from '@/components/world/ProductTour';

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
/* Guided tour                                                         */
/* ------------------------------------------------------------------ */

const ONCHAIN_TOUR: TourStep[] = [
  {
    title: 'On-Chain, in plain English 👋',
    body: "This page shows what's happening beneath the price — where money is actually moving. Quick 60-second tour? You can leave anytime.",
  },
  {
    selector: '[data-tour="oc-controls"]',
    title: 'Pick an asset & timeframe',
    body: 'Switch between BTC, ETH, SOL, BNB and AVAX, and choose a 24H / 7D / 30D window. Everything on the page updates to match.',
  },
  {
    selector: '[data-tour="oc-tiles"]',
    title: 'The four headline gauges',
    body: 'Funding (is the crowd over-leveraged?), Liquidations (who just got wiped out), Exchange Netflow (coins leaving = holding), and Long/Short (how crowded the bet is).',
  },
  {
    selector: '[data-tour="oc-spotpulse"]',
    title: 'Spot Pulse — real money vs leverage',
    body: 'Each tile compares real spot buying/selling against futures leverage. Green = genuine demand, red = selling into a leveraged rally, amber = speculative and likely to fade.',
  },
  {
    selector: '[data-tour="oc-brow"]',
    title: 'Buy/sell pressure, US demand & ETF flow',
    body: 'Is a move backed by real buyers (CVD)? Is US money leading (Coinbase premium)? What is Wall Street doing through the ETFs? Three reads on conviction.',
  },
  {
    selector: '[data-tour="oc-showmore"]',
    title: 'More when you want it',
    body: 'Open Interest and Stablecoin supply live here — expand for the full picture without the clutter up top.',
  },
  {
    title: "That's On-Chain 🎉",
    body: 'Replay this anytime with the "Take a tour" button. Explore the other tools from the sidebar.',
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function OnChainPage() {
  const [asset, setAsset] = useState<OcAsset>('BTC');
  const [range, setRange] = useState<OcRange>('24H');
  const [cvdSrc, setCvdSrc] = useState<'Futures' | 'Spot'>('Futures');
  const [more, setMore] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  // Auto-open once for first-time visitors.
  useEffect(() => {
    try {
      if (!localStorage.getItem('kumami_tour_onchain_seen')) {
        const t = setTimeout(() => setTourOpen(true), 700);
        return () => clearTimeout(t);
      }
    } catch { /* localStorage unavailable — skip auto-open */ }
  }, []);

  const closeTour = () => {
    setTourOpen(false);
    try { localStorage.setItem('kumami_tour_onchain_seen', '1'); } catch { /* ignore */ }
  };

  const a = asset;

  const market = useMarketEndpoint<OnChainPayload>(
    `/api/market/onchain?asset=${a}&range=${RANGE_API[range]}`,
  );
  const P = market.data?.panels;

  /* Real series only — an empty series renders an honest "No data yet" box, never a synthetic shape. */
  const priceS = svals(P?.oi, 'series2');
  const cvdS = cvdSrc === 'Futures' ? svals(P?.cvd, 'series') : svals(P?.cvd, 'series2');
  const premS = svals(P?.premium, 'series');
  const oiS = svals(P?.oi, 'series');
  const etfBars = svals(P?.etf, 'series');
  const etfPrice = svals(P?.etf, 'series2');
  const stbS = svals(P?.stablecoin, 'series');

  /* Panel-derived display values — always fall back to '—' (never a misleading 0). */
  const D = '—';
  const hasData = !!P;

  const fundingRate = hasData ? signPct(exNum(P.funding, 'currentRatePct'), 4) : D;

  const liqTotal = exNum(P?.liquidations, 'totalUsd');
  const liqLongPct = exNum(P?.liquidations, 'longPct') / 100;
  const liqTotalDisp = hasData ? formatUsd(liqTotal) : D;
  const liqLongsDisp = hasData ? formatUsd(liqTotal * liqLongPct) : D;
  const liqShortsDisp = hasData ? formatUsd(liqTotal * (1 - liqLongPct)) : D;

  const netUsd = exNum(P?.netflow, 'netUsd');
  const netDir: 'in' | 'out' = netUsd >= 0 ? 'out' : 'in';
  const netDisp = hasData ? formatUsd(Math.abs(netUsd)) : D;

  const glsPct = exNum(P?.longshort, 'globalPctLong');
  const topPct = exNum(P?.longshort, 'topTraderPctLong');
  const glsDisp = hasData ? `${glsPct.toFixed(0)}% Long` : D;
  const topDisp = hasData ? `${topPct.toFixed(0)}%` : D;
  const lsDiv = P?.longshort?.tags?.[0]
    ? { t: P.longshort.tags[0].label, k: TAG_K[P.longshort.tags[0].color] }
    : null;

  const premPct = exNum(P?.premium, 'premiumPct');
  const premNeg = premPct < 0;
  const premDisp = premS.length ? signPct(premPct, 3) : D;
  const premAvg7 = premS.length ? signPct(premS.reduce((s, v) => s + v, 0) / premS.length, 3) : D;
  const premTrend = !premS.length ? D
    : P?.premium?.tags?.some((t) => /Fading/.test(t.label)) ? 'Falling'
    : P?.premium?.tags?.some((t) => /Returning|Demand/.test(t.label)) ? 'Rising'
    : 'Flat';

  const oiLast = oiS.length ? oiS[oiS.length - 1] : 0;
  const oiFirst = oiS.length ? oiS[0] : 0;
  const oiChgPct = oiFirst ? ((oiLast - oiFirst) / oiFirst) * 100 : 0;
  const oiDisp = oiS.length ? formatUsd(oiLast) : D;
  const oiChgDisp = oiS.length ? signPct(oiChgPct, 1) : D;

  const etfNet7 = exNum(P?.etf, 'net7dUsd');
  const etfToday = etfBars.length ? etfBars[etfBars.length - 1] : 0;
  const etfNet7Disp = etfBars.length ? formatUsd(etfNet7) : D;
  const etfTodayDisp = etfBars.length ? formatUsd(etfToday) : D;

  const stbLast = stbS.length ? stbS[stbS.length - 1] : 0;
  const stbChg30 = exNum(P?.stablecoin, 'change30dPct');
  const stbDisp = stbS.length ? formatUsd(stbLast) : D;
  const stbChgDisp = stbS.length ? signPct(stbChg30, 1) : D;

  const cvdLast = cvdS.length ? cvdS[cvdS.length - 1] : 0;
  const cvdDisp = cvdS.length ? formatUsd(cvdLast) : D;
  const cvdTrendDisp = cvdS.length ? (cvdLast >= 0 ? 'Rising' : 'Falling') : D;
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
          <div className="w-oc-controls" data-tour="oc-controls">
            <button type="button" className="w-tour-trigger" onClick={() => setTourOpen(true)}>
              <WIcon name="spark" /> Take a tour
            </button>
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
      <div className="w-oc-tiles" data-tour="oc-tiles">
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
          <div className="w-oc-tv">{liqTotalDisp}</div>
          <div className="w-oc-tags">
            <OcTag tag={verdictTag(P?.liquidations)} />
          </div>
          <div className="w-oc-support">
            <span className="w-oc-split">
              <WIcon name="chevD" />
              <span className="down">Longs {liqLongsDisp}</span>
            </span>
            <span className="w-oc-split" style={{ transform: 'none' }}>
              <span className="up">Shorts {liqShortsDisp}</span>
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
            style={{ color: !hasData ? 'inherit' : netDir === 'out' ? 'var(--bull)' : 'var(--bear)' }}
          >
            {hasData ? (
              <>{netDisp} <span className="sub-unit">{netDir}</span></>
            ) : (
              netDisp
            )}
          </div>
          <div className="w-oc-tags">
            <OcTag tag={verdictTag(P?.netflow)} />
          </div>
          <div className="w-oc-support">{hasData ? (netDir === 'out' ? 'Coins leaving exchanges' : 'Coins arriving to exchanges') : 'Exchange balance flow'} · {range}</div>
        </div>

        <div className="w-oc-tile">
          <div className="w-oc-tile-h">
            <span className="w-oc-tl">
              <WIcon name="users" /> Long / Short Ratio
            </span>
            <OcQ tip={TIP_LS} />
          </div>
          <div className="w-oc-tv">{glsDisp}</div>
          <div className="w-oc-tags">
            <OcTag tag={verdictTag(P?.longshort)} />
            <OcTag tag={lsDiv} />
          </div>
          <div className={`w-oc-support${lsDiv ? ' warn' : ''}`}>Top traders {topDisp} long</div>
        </div>
      </div>

      {/* ---- Spot Pulse (replaces the tier-locked heatmap slot, per PM spec) ---- */}
      <div data-tour="oc-spotpulse" style={{ marginBottom: 16 }}>
        <SpotPulse />
      </div>

      {/* ---- Tier 2 row: CVD / Premium / ETF ---- */}
      <div className="w-oc-brow" data-tour="oc-brow">
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
                {cvdSrc} CVD <b className={!cvdS.length ? '' : cvdLast >= 0 ? 'up' : 'down'}>{cvdDisp}</b>
              </span>
              <span className="w-oc-fstat">
                Trend <b className={!cvdS.length ? '' : cvdLast >= 0 ? 'up' : 'down'}>{cvdTrendDisp}</b>
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
                <b style={{ fontSize: 20, color: !premS.length ? 'var(--muted)' : premNeg ? 'var(--bear)' : 'var(--accent)' }}>
                  {premDisp}
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
              <b>{etfNet7Disp}</b>
              <span className="hl-sub">7D net flow</span>
            </div>
            <ChartArea has={etfBars.length > 0}>
              <OcBars vals={etfBars} price={etfPrice} />
            </ChartArea>
            <div className="w-oc-note">30D view · best for ETF analysis</div>
            <div className="w-oc-fstats">
              <span className="w-oc-fstat">
                Today <b className={!etfBars.length ? '' : etfToday >= 0 ? 'up' : 'down'}>{etfTodayDisp}</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Show more / tier 3 ---- */}
      <button className={`w-oc-showmore${more ? ' open' : ''}`} data-tour="oc-showmore" onClick={() => setMore((v) => !v)}>
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
                <b>{oiDisp}</b>
                <span className="hl-sub">
                  total OI ·{' '}
                  <span className={!oiS.length ? '' : oiChgPct < 0 ? 'down' : 'up'}>
                    {oiChgDisp}{oiS.length ? ` ${range}` : ''}
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
                <b>{stbDisp}</b>
                <span className="hl-sub">
                  total cap · <span className={!stbS.length ? '' : stbChg30 < 0 ? 'down' : 'up'}>30D {stbChgDisp}</span>
                </span>
              </div>
              <ChartArea has={stbS.length > 0}>
                <OcArea series={stbS} color="var(--accent)" />
              </ChartArea>
            </div>
          </div>
        </div>
      )}

      {tourOpen && <ProductTour steps={ONCHAIN_TOUR} onClose={closeTour} />}
    </div>
  );
}
