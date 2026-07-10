'use client';

/**
 * /world/onchain — On-Chain Insight (Market Structure).
 *
 * Pixel-parity port of the reference mockup's R.onchain renderer, including
 * its placeholder data (ONCHAIN / OC_HEAT / OC_ETF / OC_STABLE) and the
 * seeded-random chart series. Deliberate deviations only:
 *   - reference mint #5ee9a8 → var(--accent) turquoise
 *   - KM.showTip tooltips → native title attributes on the “?” badges
 *   - KM.setMode('pro') → world mode context setMode('pro')
 */

import { useState } from 'react';
import { WIcon, coinC, type ConsoleIconName } from '@/components/world/panels/console-ui';
import {
  ocRnd,
  ocSeries,
  OcDual,
  OcBars,
  OcArea,
  hmCol,
  type OcDivType,
} from '@/components/world/panels/onchain-charts';
import { useWorldMode } from '@/contexts/WorldModeContext';

/* ------------------------------------------------------------------ */
/* Placeholder data — ported verbatim from the reference mockup        */
/* ------------------------------------------------------------------ */

type Tag = { t: string; k: string };

type AssetData = {
  price: string;
  chg: number;
  funding: { rate: string; next: string; tag: Tag; tip: string };
  liq: { total: string; longs: string; shorts: string; tag: Tag; tip: string };
  netflow: { net: string; dir: 'in' | 'out'; trend: string; tag: Tag; tip: string };
  ls: { global: string; top: string; tag: Tag; div: Tag | null; warn: boolean; tip: string };
  cvd: { wi: Tag; stats: [string, string, string][]; divType: OcDivType };
  prem: { value: string; wi: Tag; avg7: string; trend: string };
  oi: { value: string; wi: Tag; divType: OcDivType; chg: string };
};

const OC_ASSETS = ['BTC', 'ETH', 'HYPE', 'BNB', 'XRP'] as const;
type OcAsset = (typeof OC_ASSETS)[number];

const TIP_FUNDING =
  'The fee traders pay to keep leveraged bets open. When it’s high, too many people are on the same side — and the market often snaps back.';
const TIP_LIQ =
  'Leveraged positions force-closed in the last 24 hours. A big flush of longs often clears the way for a bounce; squeezed shorts often mark a top.';
const TIP_NETFLOW =
  'Coins leaving exchanges = people holding (bullish). Coins arriving = people preparing to sell (bearish).';
const TIP_LS =
  'How crowded the bet is. When the crowd leans heavily one way — and the pros lean the other — pay attention.';

const ONCHAIN: Record<OcAsset, AssetData> = {
  BTC: {
    price: '$70,418',
    chg: 2.1,
    funding: { rate: '+0.082%', next: '3h 22m', tag: { t: 'Crowded Long', k: 'amber' }, tip: TIP_FUNDING },
    liq: { total: '$182M', longs: '$120M', shorts: '$62M', tag: { t: 'Long Cleanup', k: 'ggreen' }, tip: TIP_LIQ },
    netflow: { net: '$340M', dir: 'out', trend: 'Outflow accelerating · 7D', tag: { t: 'Accumulation', k: 'ggreen' }, tip: TIP_NETFLOW },
    ls: { global: '62% Long', top: 'Top traders 51% long', tag: { t: 'Long Bias', k: 'ggreen' }, div: { t: 'Smart Money Fading', k: 'amber' }, warn: true, tip: TIP_LS },
    cvd: { wi: { t: 'Buyer-Led Rally', k: 'bull' }, stats: [['24H CVD', '+$418M', 'up'], ['Spot', 'Aligned', ''], ['Trend', 'Rising', 'up']], divType: 'acc' },
    prem: { value: '+0.12%', wi: { t: 'Strong US Premium · Institutional Demand', k: 'bull' }, avg7: '+0.08%', trend: 'Rising' },
    oi: { value: '$2.18B', wi: { t: 'Trend Strengthening', k: 'bull' }, divType: 'acc', chg: '+6.4%' },
  },
  ETH: {
    price: '$3,642',
    chg: 1.4,
    funding: { rate: '+0.041%', next: '3h 22m', tag: { t: 'Neutral', k: 'neutral' }, tip: TIP_FUNDING },
    liq: { total: '$96M', longs: '$38M', shorts: '$58M', tag: { t: 'Short Cleanup', k: 'neutral' }, tip: TIP_LIQ },
    netflow: { net: '$74M', dir: 'in', trend: 'Inflow vs 7D avg: +18%', tag: { t: 'Mild Distribution', k: 'gred' }, tip: TIP_NETFLOW },
    ls: { global: '57% Long', top: 'Top traders 54% long', tag: { t: 'Long Bias', k: 'ggreen' }, div: null, warn: false, tip: TIP_LS },
    cvd: { wi: { t: 'Balanced Tape', k: 'neutral' }, stats: [['24H CVD', '+$42M', 'up'], ['Spot', 'Diverging', 'down'], ['Trend', 'Flat', '']], divType: 'none' },
    prem: { value: '+0.04%', wi: { t: 'Mild US Premium', k: 'bull' }, avg7: '+0.02%', trend: 'Flat' },
    oi: { value: '$1.53B', wi: { t: 'Trend Strengthening', k: 'bull' }, divType: 'acc', chg: '+4.1%' },
  },
  HYPE: {
    price: '$38.42',
    chg: 3.2,
    funding: { rate: '+0.096%', next: '3h 22m', tag: { t: 'Crowded Long', k: 'amber' }, tip: TIP_FUNDING },
    liq: { total: '$74M', longs: '$26M', shorts: '$48M', tag: { t: 'Short Squeeze', k: 'ggreen' }, tip: TIP_LIQ },
    netflow: { net: '$52M', dir: 'out', trend: 'Outflow accelerating · 7D', tag: { t: 'Accumulation', k: 'ggreen' }, tip: TIP_NETFLOW },
    ls: { global: '64% Long', top: 'Top traders 58% long', tag: { t: 'Long Bias', k: 'ggreen' }, div: null, warn: false, tip: TIP_LS },
    cvd: { wi: { t: 'Buyer-Led Rally', k: 'bull' }, stats: [['24H CVD', '+$96M', 'up'], ['Spot', 'Aligned', ''], ['Trend', 'Rising', 'up']], divType: 'acc' },
    prem: { value: '+0.07%', wi: { t: 'US Premium Building', k: 'bull' }, avg7: '+0.05%', trend: 'Rising' },
    oi: { value: '$512M', wi: { t: 'Trend Strengthening', k: 'bull' }, divType: 'acc', chg: '+8.1%' },
  },
  BNB: {
    price: '$604.1',
    chg: 0.6,
    funding: { rate: '+0.018%', next: '3h 22m', tag: { t: 'Neutral', k: 'neutral' }, tip: TIP_FUNDING },
    liq: { total: '$28M', longs: '$14M', shorts: '$14M', tag: { t: 'Balanced', k: 'neutral' }, tip: TIP_LIQ },
    netflow: { net: '$12M', dir: 'out', trend: 'Flat vs 7D avg', tag: { t: 'Neutral', k: 'neutral' }, tip: TIP_NETFLOW },
    ls: { global: '54% Long', top: 'Top traders 53% long', tag: { t: 'Balanced', k: 'neutral' }, div: null, warn: false, tip: TIP_LS },
    cvd: { wi: { t: 'Balanced Tape', k: 'neutral' }, stats: [['24H CVD', '+$6M', 'up'], ['Spot', 'Aligned', ''], ['Trend', 'Flat', '']], divType: 'none' },
    prem: { value: '+0.01%', wi: { t: 'Neutral Demand', k: 'neutral' }, avg7: '+0.00%', trend: 'Flat' },
    oi: { value: '$418M', wi: { t: 'Trend Strengthening', k: 'bull' }, divType: 'none', chg: '+1.2%' },
  },
  XRP: {
    price: '$0.612',
    chg: -1.9,
    funding: { rate: '+0.144%', next: '3h 22m', tag: { t: 'Overheated Long', k: 'red' }, tip: TIP_FUNDING },
    liq: { total: '$64M', longs: '$52M', shorts: '$12M', tag: { t: 'Long Flush', k: 'green' }, tip: TIP_LIQ },
    netflow: { net: '$41M', dir: 'in', trend: 'Inflow accelerating · 7D', tag: { t: 'Distribution', k: 'red' }, tip: TIP_NETFLOW },
    ls: { global: '76% Long', top: 'Top traders 48% long', tag: { t: 'Extremely Crowded Long', k: 'red' }, div: { t: 'Smart Money Fading the Crowd', k: 'amber' }, warn: true, tip: TIP_LS },
    cvd: { wi: { t: 'Distribution Rally · Speculative', k: 'bear' }, stats: [['24H CVD', '−$31M', 'down'], ['Spot', 'Diverging', 'down'], ['Trend', 'Falling', 'down']], divType: 'dist' },
    prem: { value: '−0.09%', wi: { t: 'Offshore Leading', k: 'warn' }, avg7: '−0.05%', trend: 'Falling' },
    oi: { value: '$286M', wi: { t: 'Leverage Building', k: 'warn' }, divType: 'dist', chg: '+3.3%' },
  },
};

const OC_HEAT_WI: Record<OcAsset, Tag> = {
  BTC: { t: 'Upside Magnet — Short Squeeze Setup', k: 'bull' },
  ETH: { t: 'Balanced Liquidity Both Sides', k: 'neutral' },
  HYPE: { t: 'Upside Cluster — Short Squeeze Setup', k: 'bull' },
  BNB: { t: 'Thin Liquidity — Low Conviction', k: 'neutral' },
  XRP: { t: 'Downside Cluster — Long Liquidation Risk', k: 'bear' },
};

const OC_ETF = {
  BTC: { net7: '+$1.24B', prev7: '+$340M', today: '+$186M', largest: 'Jun 27 · +$482M', wi: { t: 'Sustained Institutional Accumulation', k: 'bull' } },
  ETH: { net7: '+$286M', prev7: '−$41M', today: '+$62M', largest: 'Jun 26 · +$118M', wi: { t: 'Dual Institutional Signal', k: 'bull' } },
} satisfies Record<string, { net7: string; prev7: string; today: string; largest: string; wi: Tag }>;

const OC_STABLE = { cap: '$179.6B', chg30: '+2.1%', wi: { t: 'Dry Powder Building', k: 'bull' } };

const RANGES = ['24H', '7D', '30D'] as const;
type OcRange = (typeof RANGES)[number];
const N: Record<OcRange, number> = { '24H': 24, '7D': 28, '30D': 30 };

/* Heatmap cluster data — same seeded generation as the reference */
const OC_HEAT = OC_ASSETS.map((sym) => {
  const r = ocRnd('hm' + sym);
  const clusters: number[] = [];
  for (let i = 0; i < 26; i++) {
    let v = r() * 0.35;
    const d = Math.abs(i - 6),
      d2 = Math.abs(i - 19);
    if (d < 3) v += (0.8 - d * 0.2) * (0.6 + r() * 0.4);
    if (d2 < 3) v += (0.7 - d2 * 0.18) * (0.5 + r() * 0.4);
    clusters.push(Math.min(1, v));
  }
  return { sym, price: ONCHAIN[sym].price, clusters, curIdx: 13 };
});

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
      <WIcon name={WI_IC[wi.k]} /> {wi.t}
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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function OnChainPage() {
  const { setMode } = useWorldMode();
  const [asset, setAsset] = useState<OcAsset>('BTC');
  const [range, setRange] = useState<OcRange>('24H');
  const [heatTf, setHeatTf] = useState<OcRange>('24H');
  const [cvdSrc, setCvdSrc] = useState<'Futures' | 'Spot'>('Futures');
  const [etfSel, setEtfSel] = useState<'BTC' | 'ETH'>('BTC');
  const [more, setMore] = useState(false);

  const a = asset;
  const d = ONCHAIN[a];
  const n = N[range];

  const priceEnd = parseFloat(String(d.price).replace(/[^0-9.]/g, '')) || 100;
  const priceS = ocSeries(
    'px' + a + range,
    n,
    priceEnd * (d.chg < 0 ? 1.03 : 0.97),
    priceEnd * 0.02,
    (priceEnd * (d.chg > 0 ? 0.004 : -0.004)) / n
  );

  /* CVD */
  const cvd = d.cvd;
  const cvdS = ocSeries(
    'cvd' + a + cvdSrc + range,
    n,
    0,
    cvd.divType === 'dist' ? 3 : 2.4,
    cvd.divType === 'dist' ? -0.25 : cvd.divType === 'acc' ? 0.32 : 0.02
  );

  /* Coinbase premium */
  const premNeg = String(d.prem.value).startsWith('−');
  const premS = ocSeries('prem' + a + range, n, premNeg ? -0.02 : 0.03, 0.05, premNeg ? -0.002 : 0.002);

  /* ETF */
  const etf = OC_ETF[etfSel];
  const etfBias = etfSel === 'BTC' ? 0.62 : 0.34;
  const rndE = ocRnd('etfb' + etfSel);
  const etfBars = Array.from({ length: 30 }, (_, i) => {
    let v = (rndE() - 0.5 + etfBias) * 1.9;
    if (i > 24) v += 0.6;
    return v;
  });
  const etfPrice = ocSeries('etfpx' + etfSel, 30, 100, 3, 0.5);

  /* Tier 3 */
  const oiS = ocSeries('oi' + a + range, n, 100, 4, d.oi.divType === 'dist' ? 0.2 : 0.6);
  const stbS = ocSeries('stable', 30, 150, 2, 1);

  const ls = d.ls;

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
            <OcQ tip={d.funding.tip} />
          </div>
          <div className="w-oc-tv">{d.funding.rate}</div>
          <div className="w-oc-tags">
            <OcTag tag={d.funding.tag} />
          </div>
          <div className="w-oc-support">
            Every 8H · Next <b style={{ color: 'var(--ink)' }}>{d.funding.next}</b>
          </div>
        </div>

        <div className="w-oc-tile">
          <div className="w-oc-tile-h">
            <span className="w-oc-tl">
              <WIcon name="bolt" /> Liquidations 24H
            </span>
            <OcQ tip={d.liq.tip} />
          </div>
          <div className="w-oc-tv">{d.liq.total}</div>
          <div className="w-oc-tags">
            <OcTag tag={d.liq.tag} />
          </div>
          <div className="w-oc-support">
            <span className="w-oc-split">
              <WIcon name="chevD" />
              <span className="down">Longs {d.liq.longs}</span>
            </span>
            <span className="w-oc-split" style={{ transform: 'none' }}>
              <span className="up">Shorts {d.liq.shorts}</span>
            </span>
          </div>
        </div>

        <div className="w-oc-tile">
          <div className="w-oc-tile-h">
            <span className="w-oc-tl">
              <WIcon name="layers" /> Exchange Netflow
            </span>
            <OcQ tip={d.netflow.tip} />
          </div>
          <div
            className="w-oc-tv"
            style={{ color: d.netflow.dir === 'out' ? 'var(--bull)' : 'var(--bear)' }}
          >
            {d.netflow.net} <span className="sub-unit">{d.netflow.dir}</span>
          </div>
          <div className="w-oc-tags">
            <OcTag tag={d.netflow.tag} />
          </div>
          <div className="w-oc-support">{d.netflow.trend}</div>
        </div>

        <div className="w-oc-tile">
          <div className="w-oc-tile-h">
            <span className="w-oc-tl">
              <WIcon name="users" /> Long / Short Ratio
            </span>
            <OcQ tip={ls.tip} />
          </div>
          <div className="w-oc-tv">{ls.global}</div>
          <div className="w-oc-tags">
            <OcTag tag={ls.tag} />
            <OcTag tag={ls.div} />
          </div>
          <div className={`w-oc-support${ls.warn ? ' warn' : ''}`}>{ls.top}</div>
        </div>
      </div>

      {/* ---- Liquidation heatmap ---- */}
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
          <div className="w-oc-wi-row">
            <OcWI wi={OC_HEAT_WI[a]} />
          </div>
          <div className="w-oc-pb">
            <div className="w-oc-hm-legend-top">
              <span>
                ◂ {(priceEnd * 0.8).toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                downside
              </span>
              <span>Current price ▮</span>
              <span>
                {(priceEnd * 1.2).toLocaleString(undefined, { maximumFractionDigits: 2 })} upside ▸
              </span>
            </div>
            <div className="w-oc-hm-rows">
              {OC_HEAT.map((row) => (
                <div key={row.sym} className={`w-oc-hm-row${row.sym === a ? ' active' : ''}`}>
                  <span className="w-oc-hm-sym">
                    <Coin sym={row.sym} />
                    {row.sym}
                  </span>
                  <span className="w-oc-hm-bar">
                    {row.clusters.map((v, i) => (
                      <span key={i} style={{ background: hmCol(v) }} />
                    ))}
                    <span
                      className="w-oc-hm-now"
                      style={{ left: `${(row.curIdx / (row.clusters.length - 1)) * 100}%` }}
                    />
                  </span>
                  <span className="w-oc-hm-price">{row.price}</span>
                </div>
              ))}
              <div className="w-oc-hm-row ghost">
                <span className="w-oc-hm-sym">
                  <span className="w-coin" style={{ background: '#33413b' }}>
                    +
                  </span>
                  +12 more
                </span>
                <span className="w-oc-hm-bar">
                  {OC_HEAT[0].clusters.map((v, i) => (
                    <span key={i} style={{ background: hmCol(v * 0.7) }} />
                  ))}
                </span>
                <span className="w-oc-hm-price">
                  <WIcon name="lock" />
                </span>
              </div>
            </div>
            <div className="w-oc-hm-scale">
              <span>Less</span>
              <span className="grad" />
              <span>More</span>
              <span className="w-delay-note" style={{ marginLeft: 'auto' }}>
                <WIcon name="clock" /> 15-min delayed
              </span>
            </div>
          </div>
          <div className="w-oc-hm-foot">
            <span className="fcount">12 more assets · Real-time updates</span>
            <a onClick={() => setMode('pro')}>
              <WIcon name="lock" /> Unlock Pro <WIcon name="arrowR" />
            </a>
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
              <OcQ tip="Whether a move is driven by real buyers or running on empty. Real buying lasts; hollow rallies reverse." />
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
            <OcWI wi={cvd.wi} />
          </div>
          <div className="w-oc-pb">
            <div className="w-oc-chart">
              <OcDual
                a={cvdS}
                b={priceS}
                divType={cvd.divType}
                primary={cvd.divType === 'dist' ? '#ff6b81' : 'var(--accent)'}
              />
            </div>
            <div className="w-oc-fstats">
              {cvd.stats.map((s) => (
                <span key={s[0]} className="w-oc-fstat">
                  {s[0]} <b className={s[2] || ''}>{s[1]}</b>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Coinbase premium */}
        <div className="w-oc-panel">
          <div className="w-oc-ph">
            <span className="w-oc-ttl">
              <WIcon name="building" /> US Demand Premium{' '}
              <OcQ tip="The price gap between Coinbase (US money) and offshore exchanges. US-led moves tend to be steadier and last longer." />
              <span className="w-oc-ph-sub">US vs offshore price gap · Coinbase premium</span>
            </span>
            <span className="w-oc-ph-r">
              <span className="w-oc-headline" style={{ margin: 0 }}>
                <b style={{ fontSize: 20, color: premNeg ? 'var(--bear)' : 'var(--accent)' }}>
                  {d.prem.value}
                </b>
              </span>
            </span>
          </div>
          <div className="w-oc-wi-row">
            <OcWI wi={d.prem.wi} />
          </div>
          <div className="w-oc-pb">
            <div className="w-oc-chart">
              <OcArea series={premS} color={premNeg ? '#ff6b81' : 'var(--accent)'} zeroVal={0} />
            </div>
            <div className="w-oc-fstats">
              <span className="w-oc-fstat">
                7D avg <b>{d.prem.avg7}</b>
              </span>
              <span className="w-oc-fstat">
                Trend <b>{d.prem.trend}</b>
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
            <span className="w-oc-ph-r">
              <span className="w-mini-toggle">
                {(['BTC', 'ETH'] as const).map((t) => (
                  <button key={t} className={etfSel === t ? 'on' : ''} onClick={() => setEtfSel(t)}>
                    {t}
                  </button>
                ))}
              </span>
            </span>
          </div>
          <div className="w-oc-wi-row">
            <OcWI wi={etf.wi} />
          </div>
          <div className="w-oc-pb">
            <div className="w-oc-headline">
              <b>{etf.net7}</b>
              <span className="hl-sub">7D net · vs prev 7D {etf.prev7}</span>
            </div>
            <div className="w-oc-chart">
              <OcBars vals={etfBars} price={etfPrice} />
            </div>
            <div className="w-oc-note">30D view · best for ETF analysis</div>
            <div className="w-oc-fstats">
              <span className="w-oc-fstat">
                Today <b className="up">{etf.today}</b>
              </span>
              <span className="w-oc-fstat">
                Largest <b>{etf.largest}</b>
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
                <OcQ tip="Total leveraged bets in the market. Rising with price = healthy trend. Rising without price = pressure building." />
                <span className="w-oc-ph-sub">Leverage in the system</span>
              </span>
            </div>
            <div className="w-oc-wi-row">
              <OcWI wi={d.oi.wi} />
            </div>
            <div className="w-oc-pb">
              <div className="w-oc-headline">
                <b>{d.oi.value}</b>
                <span className="hl-sub">
                  total OI ·{' '}
                  <span className={d.oi.chg.startsWith('−') ? 'down' : 'up'}>
                    {d.oi.chg} {range}
                  </span>
                </span>
              </div>
              <div className="w-oc-chart">
                <OcDual a={oiS} b={priceS} divType={d.oi.divType} primary="var(--accent)" />
              </div>
            </div>
          </div>

          {/* Stablecoin supply */}
          <div className="w-oc-panel">
            <div className="w-oc-ph">
              <span className="w-oc-ttl">
                <WIcon name="shield" /> Stablecoin Supply{' '}
                <OcQ tip="Cash sitting on the sidelines. When it grows, there’s more dry powder waiting to buy in." />
                <span className="w-oc-ph-sub">Dry powder · 90D</span>
              </span>
            </div>
            <div className="w-oc-wi-row">
              <OcWI wi={OC_STABLE.wi} />
            </div>
            <div className="w-oc-pb">
              <div className="w-oc-headline">
                <b>{OC_STABLE.cap}</b>
                <span className="hl-sub">
                  total cap · <span className="up">30D {OC_STABLE.chg30}</span>
                </span>
              </div>
              <div className="w-oc-chart">
                <OcArea series={stbS} color="var(--accent)" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
