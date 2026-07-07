/**
 * Mock fixtures for the /world market-data platform.
 *
 * Uses a deterministic mulberry32 PRNG seeded per hour so pages look alive
 * but are stable within a session (seed = Math.floor(Date.now() / 3600_000)).
 *
 * Realistic magnitude ranges:
 *   BTC  ~$60k–$70k   ETH  ~$2.5k–$3.5k   SOL  ~$130–$180
 *   GOLD ~$2200–$2500  SPX  ~$5000–$5400
 *   funding rates ±0.15%   liq totals $50M–$1.5B   ETF flows ±$800M
 *   fear & greed 0–100
 *
 * Free-tier gating note:
 *   The mock pre-caps heatmap to 5 assets when tier='free' and sets capped:true.
 *   Real server-side gating (access-control rules) is implemented in Task 3.4;
 *   the mock mirrors the expected output shape so UI can be built against it now.
 */

import type {
  ConsolePayload,
  FlowEvent,
  HeatmapPayload,
  IntelligencePayload,
  MetricPanelKey,
  OnChainPayload,
  Series,
  Verdict,
  WatchlistPayload,
} from '../contracts';
import { classifyFearGreed } from '../rules/regime';

// ---------------------------------------------------------------------------
// PRNG — mulberry32
// ---------------------------------------------------------------------------

/** Returns a mulberry32 PRNG initialised with the given seed. */
function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed changes once per hour so fixtures are stable within a session. */
function hourSeed(): number {
  return Math.floor(Date.now() / 3_600_000);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rnd(prng: () => number, min: number, max: number): number {
  return min + prng() * (max - min);
}

function rndInt(prng: () => number, min: number, max: number): number {
  return Math.floor(rnd(prng, min, max + 1));
}

function pick<T>(prng: () => number, arr: T[]): T {
  return arr[Math.floor(prng() * arr.length)];
}

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function makeSeries(
  prng: () => number,
  points: number,
  base: number,
  spread: number,
  intervalMs: number
): Series {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => ({
    t: now - (points - 1 - i) * intervalMs,
    v: parseFloat((base + rnd(prng, -spread, spread)).toFixed(4)),
  }));
}

// ---------------------------------------------------------------------------
// Verdict builders
// ---------------------------------------------------------------------------

const ALL_COLORS: Verdict['color'][] = ['green', 'grey-green', 'grey', 'amber', 'grey-red', 'red'];

function verdict(label: string, color: Verdict['color']): Verdict {
  return { label, color };
}

// ---------------------------------------------------------------------------
// Flow events — ~12 events spanning last 24h
// ---------------------------------------------------------------------------

const FLOW_TYPES: FlowEvent['type'][] = [
  'whale_transfer',
  'exchange_flow',
  'liq_spike',
  'netflow_flip',
  'whale_wall',
  'smart_money',
];

const DIRECTION_BY_TYPE: Record<FlowEvent['type'], FlowEvent['direction'][]> = {
  whale_transfer: ['Inflow', 'Outflow', 'Accumulation'],
  exchange_flow: ['Inflow', 'Outflow'],
  liq_spike: ['Buy Pressure', 'Sell Pressure'],
  netflow_flip: ['Inflow', 'Outflow'],
  whale_wall: ['Resistance Wall', 'Support Wall'],
  smart_money: ['Smart Money', 'Accumulation'],
};

export function makeFlowEvents(prng: () => number, count: number): FlowEvent[] {
  const assets = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB'];
  const severities: FlowEvent['severity'][] = ['HIGH', 'MED', 'LOW'];

  // Guarantee at least one HIGH whale_transfer, one MED, one LOW
  const guaranteed: Array<{
    type: FlowEvent['type'];
    severity: FlowEvent['severity'];
  }> = [
    { type: 'whale_transfer', severity: 'HIGH' },
    { type: 'exchange_flow', severity: 'MED' },
    { type: 'liq_spike', severity: 'LOW' },
  ];

  return Array.from({ length: count }, (_, i) => {
    const g = guaranteed[i] ?? null;
    const type: FlowEvent['type'] = g ? g.type : pick(prng, FLOW_TYPES);
    const severity: FlowEvent['severity'] = g ? g.severity : pick(prng, severities);
    const asset = pick(prng, assets);
    const direction = pick(prng, DIRECTION_BY_TYPE[type]);
    const amountUsd =
      severity === 'HIGH'
        ? rnd(prng, 50_000_000, 500_000_000)
        : severity === 'MED'
          ? rnd(prng, 5_000_000, 50_000_000)
          : rnd(prng, 500_000, 5_000_000);

    const descriptions: Record<FlowEvent['type'], string> = {
      whale_transfer: `Large ${asset} transfer detected — ${direction.toLowerCase()} signal`,
      exchange_flow: `Significant ${asset} ${direction.toLowerCase()} to exchange wallets`,
      liq_spike: `Liquidation cluster triggered on ${asset} — ${direction}`,
      netflow_flip: `${asset} exchange netflow flipped to ${direction}`,
      whale_wall: `${asset} ${direction} order wall detected near key level`,
      smart_money: `${asset} smart-money ${direction} signal confirmed`,
    };

    return {
      id: `flow-${i}-${hourSeed()}`,
      type,
      asset,
      amountUsd: Math.round(amountUsd),
      direction,
      severity,
      description: descriptions[type],
      ts: isoAgo(rnd(prng, 0, 86_400_000)),
      interpretation:
        severity === 'HIGH'
          ? `This ${type.replace('_', ' ')} event suggests elevated ${direction === 'Inflow' || direction === 'Accumulation' ? 'buying' : 'selling'} pressure for ${asset}.`
          : undefined,
    } satisfies FlowEvent;
  });
}

// ---------------------------------------------------------------------------
// Console payload
// ---------------------------------------------------------------------------

export function makeConsolePayload(prng: () => number): ConsolePayload {
  const allFlows = makeFlowEvents(prng, 12);

  const btcPrice = rnd(prng, 60_000, 70_000);
  const ethPrice = rnd(prng, 2_500, 3_500);
  const solPrice = rnd(prng, 130, 180);
  const goldPrice = rnd(prng, 2_200, 2_500);
  const spxPrice = rnd(prng, 5_000, 5_400);

  const fearGreed = rndInt(prng, 10, 90);
  const fg = classifyFearGreed(fearGreed);
  // Map FearGreedClassification.color → Verdict.color for the panel verdict chip
  const fgVerdictColor: Verdict['color'] =
    fg.color === 'lime' ? 'grey-green' : fg.color;

  return {
    marketConditions: {
      verdict: verdict(fg.label, fgVerdictColor),
      fearGreedLabel: fg.label,
      fearGreedColor: fg.color,
      tags: [
        verdict('· Rising Fast', 'amber'),
        verdict('· Smart Money Fading', 'grey-red'),
      ],
      confidence: parseFloat(rnd(prng, 0.55, 0.92).toFixed(2)),
      interpretation:
        'Markets are showing elevated speculative positioning with smart-money signals beginning to fade. Proceed with caution near resistance.',
      updatedAt: isoAgo(30_000),
      fearGreed,
      tiles: {
        etfFlow7d: {
          usd: Math.round(rnd(prng, -800_000_000, 800_000_000)),
          pctVsPrev: parseFloat(rnd(prng, -40, 60).toFixed(1)),
        },
        dxy: null, // null until macro data source is wired
        onChainBias: {
          pctLong: parseFloat(rnd(prng, 48, 70).toFixed(1)),
          ratio: parseFloat(rnd(prng, 0.9, 2.5).toFixed(2)),
        },
        liq24h: {
          totalUsd: Math.round(rnd(prng, 50_000_000, 1_500_000_000)),
          pctVsAvg7d: parseFloat(rnd(prng, -30, 120).toFixed(1)),
        },
      },
    },

    regimeChips: [
      {
        asset: 'BTC',
        price: parseFloat(btcPrice.toFixed(2)),
        change24h: parseFloat(rnd(prng, -5, 8).toFixed(2)),
        regime: pick(prng, ['Bullish', 'Neutral', 'Bearish'] as const),
        confidence: parseFloat(rnd(prng, 0.55, 0.95).toFixed(2)),
      },
      {
        asset: 'ETH',
        price: parseFloat(ethPrice.toFixed(2)),
        change24h: parseFloat(rnd(prng, -6, 9).toFixed(2)),
        regime: pick(prng, ['Bullish', 'Neutral', 'Bearish'] as const),
        confidence: parseFloat(rnd(prng, 0.5, 0.9).toFixed(2)),
      },
      {
        asset: 'SOL',
        price: parseFloat(solPrice.toFixed(2)),
        change24h: parseFloat(rnd(prng, -8, 12).toFixed(2)),
        regime: pick(prng, ['Bullish', 'Neutral', 'Bearish'] as const),
        confidence: parseFloat(rnd(prng, 0.5, 0.88).toFixed(2)),
      },
      {
        asset: 'GOLD',
        price: parseFloat(goldPrice.toFixed(2)),
        change24h: parseFloat(rnd(prng, -2, 2).toFixed(2)),
        regime: pick(prng, ['Bullish', 'Neutral', 'Bearish'] as const),
        confidence: parseFloat(rnd(prng, 0.45, 0.8).toFixed(2)),
      },
      {
        asset: 'SPX',
        price: parseFloat(spxPrice.toFixed(2)),
        change24h: parseFloat(rnd(prng, -3, 4).toFixed(2)),
        regime: pick(prng, ['Bullish', 'Neutral', 'Bearish'] as const),
        confidence: parseFloat(rnd(prng, 0.5, 0.85).toFixed(2)),
      },
    ],

    heatmapPreview: [
      { asset: 'BTC', liqUsd24h: Math.round(rnd(prng, 20_000_000, 300_000_000)), longShare: parseFloat(rnd(prng, 45, 72).toFixed(1)) },
      { asset: 'ETH', liqUsd24h: Math.round(rnd(prng, 10_000_000, 150_000_000)), longShare: parseFloat(rnd(prng, 44, 70).toFixed(1)) },
      { asset: 'SOL', liqUsd24h: Math.round(rnd(prng, 5_000_000, 80_000_000)), longShare: parseFloat(rnd(prng, 40, 68).toFixed(1)) },
      { asset: 'BNB', liqUsd24h: Math.round(rnd(prng, 2_000_000, 40_000_000)), longShare: parseFloat(rnd(prng, 42, 65).toFixed(1)) },
      { asset: 'AVAX', liqUsd24h: Math.round(rnd(prng, 1_000_000, 20_000_000)), longShare: parseFloat(rnd(prng, 38, 62).toFixed(1)) },
    ],

    // Console shows the last 6 flow events
    flowRadar: allFlows.slice(0, 6),

    intelPreview: [
      {
        tier: 'A',
        headline: 'Fed minutes signal pause — risk assets pricing in rate-cut delay',
        category: 'Macro',
        source: 'Federal Reserve',
        ts: isoAgo(rnd(prng, 1_800_000, 7_200_000)),
      },
      {
        tier: 'A',
        headline: 'BlackRock BTC ETF sees largest single-day inflow since January',
        category: 'ETF Flows',
        source: 'Bloomberg',
        ts: isoAgo(rnd(prng, 3_600_000, 14_400_000)),
      },
      {
        tier: 'B',
        headline: 'SOL ecosystem TVL surpasses $8B — DeFi activity accelerating',
        category: 'On-Chain',
        source: 'DeFiLlama',
        ts: isoAgo(rnd(prng, 7_200_000, 21_600_000)),
      },
      {
        tier: 'C',
        headline: 'Minor network upgrade scheduled for ETH mainnet — no disruption expected',
        category: 'Protocol',
        source: 'Ethereum Foundation',
        ts: isoAgo(rnd(prng, 14_400_000, 43_200_000)),
      },
    ],

    radarWatchlist: [
      { asset: 'BTC', price: parseFloat(btcPrice.toFixed(2)), change24h: parseFloat(rnd(prng, -5, 8).toFixed(2)), signal: 'Breakout Approaching' },
      { asset: 'ETH', price: parseFloat(ethPrice.toFixed(2)), change24h: parseFloat(rnd(prng, -6, 9).toFixed(2)), signal: 'Support Hold' },
      { asset: 'SOL', price: parseFloat(solPrice.toFixed(2)), change24h: parseFloat(rnd(prng, -8, 12).toFixed(2)), signal: 'Momentum Fading' },
      { asset: 'BNB', price: parseFloat(rnd(prng, 350, 500).toFixed(2)), change24h: parseFloat(rnd(prng, -4, 6).toFixed(2)), signal: 'Range Compression' },
    ],
  };
}

// ---------------------------------------------------------------------------
// On-chain payload
// ---------------------------------------------------------------------------

const ONCHAIN_PANEL_CONFIGS: Array<{
  key: MetricPanelKey;
  headline: (prng: () => number) => string;
  verdictLabel: string;
  color: Verdict['color'];
  tags: Verdict[];
  confidence: number;
}> = [
  {
    key: 'funding',
    headline: (prng) => `Funding rate ${rnd(prng, -0.05, 0.15).toFixed(3)}% — ${rnd(prng, 0.05, 0.15) > 0.08 ? 'longs paying premium' : 'near neutral'}`,
    verdictLabel: 'Longs Dominant',
    color: 'amber',
    tags: [verdict('· Elevated Funding', 'amber')],
    confidence: 0.74,
  },
  {
    key: 'liquidations',
    // headline no longer encodes longPct — structured value lives in extra.longPct
    headline: (prng) => `$${(rnd(prng, 50, 800)).toFixed(0)}M liquidated in 24h — long-heavy session`,
    verdictLabel: 'Long-Heavy Liquidations',
    color: 'grey-red',
    tags: [verdict('· Rising Fast', 'red')],
    confidence: 0.81,
  },
  {
    key: 'netflow',
    headline: (prng) => `${rnd(prng, -30_000, 30_000).toFixed(0)} BTC net ${rnd(prng, 0, 1) > 0.5 ? 'outflow' : 'inflow'} — exchange reserves ${rnd(prng, 0, 1) > 0.5 ? 'declining' : 'rising'}`,
    verdictLabel: 'Accumulation Signal',
    color: 'green',
    tags: [verdict('· Smart Money Entering', 'grey-green')],
    confidence: 0.68,
  },
  {
    key: 'longshort',
    headline: (prng) => `Long/Short ratio ${rnd(prng, 0.9, 2.5).toFixed(2)} — market ${rnd(prng, 0.9, 2.5) > 1.5 ? 'leaning long' : 'balanced'}`,
    verdictLabel: 'Neutral Bias',
    color: 'grey',
    tags: [],
    confidence: 0.6,
  },
  {
    key: 'heatmap',
    headline: (prng) => `$${(rnd(prng, 200, 800)).toFixed(0)}M in liq clusters within 3% of price`,
    verdictLabel: 'High Cluster Density',
    color: 'grey-red',
    tags: [verdict('· Watch $60k Zone', 'amber')],
    confidence: 0.77,
  },
  {
    key: 'cvd',
    headline: (prng) => `CVD ${rnd(prng, 0, 1) > 0.5 ? 'positive' : 'negative'} — cumulative ${rnd(prng, 0, 1) > 0.5 ? 'buy' : 'sell'} pressure dominating`,
    verdictLabel: 'Buy Pressure',
    color: 'grey-green',
    tags: [verdict('· Sustained Buying', 'green')],
    confidence: 0.71,
  },
  {
    key: 'premium',
    headline: (prng) => `Futures premium ${rnd(prng, -0.5, 2.5).toFixed(2)}% — ${rnd(prng, -0.5, 2.5) > 1 ? 'contango elevated' : 'near fair value'}`,
    verdictLabel: 'Slight Contango',
    color: 'grey-green',
    tags: [],
    confidence: 0.65,
  },
  {
    key: 'etf',
    headline: (prng) => `$${(rnd(prng, -800, 800)).toFixed(0)}M 7d ETF net flow — ${rnd(prng, -800, 800) > 0 ? 'institutional accumulation' : 'institutional distribution'}`,
    verdictLabel: 'Net Inflow',
    color: 'green',
    tags: [verdict('· Institutional Buying', 'grey-green')],
    confidence: 0.83,
  },
  {
    key: 'oi',
    headline: (prng) => `Open interest $${(rnd(prng, 5, 30)).toFixed(1)}B — ${rnd(prng, 0, 1) > 0.5 ? 'expanding with price' : 'diverging from price'}`,
    verdictLabel: 'OI Expanding',
    color: 'amber',
    tags: [verdict('· Leverage Building', 'amber')],
    confidence: 0.69,
  },
  {
    key: 'stablecoin',
    headline: (prng) => `$${(rnd(prng, 100, 600)).toFixed(0)}M stablecoin inflow to exchanges — ${rnd(prng, 0, 1) > 0.5 ? 'dry powder accumulating' : 'buy signal forming'}`,
    verdictLabel: 'Dry Powder Rising',
    color: 'grey-green',
    tags: [verdict('· Sidelined Capital', 'grey')],
    confidence: 0.72,
  },
];

export function makeOnChainPayload(
  prng: () => number,
  asset: string,
  range: '24h' | '7d' | '30d'
): OnChainPayload {
  const points = range === '24h' ? 24 : range === '7d' ? 42 : 60;
  const intervalMs =
    range === '24h' ? 3_600_000 : range === '7d' ? 4 * 3_600_000 : 12 * 3_600_000;

  // ETF panel is always 30 daily points regardless of requested range.
  // This makes the "Always 30D" label true — it never inherits the range-
  // dependent point count used by the other panels.
  const ETF_POINTS = 30;
  const ETF_INTERVAL_MS = 24 * 3_600_000; // 1 day

  const panels = {} as OnChainPayload['panels'];

  for (const cfg of ONCHAIN_PANEL_CONFIGS) {
    // Build per-panel structured extras
    let extra: Record<string, number | string> = { asset, range };

    let series2: Series | undefined;

    if (cfg.key === 'funding') {
      const currentRatePct = parseFloat(rnd(prng, -0.05, 0.15).toFixed(4));
      extra = { asset, range, currentRatePct };
    } else if (cfg.key === 'liquidations') {
      const totalUsd = Math.round(rnd(prng, 50_000_000, 800_000_000));
      const longPct  = parseFloat(rnd(prng, 55, 75).toFixed(1));
      extra = { asset, range, totalUsd, longPct };
    } else if (cfg.key === 'netflow') {
      const netUsd = Math.round(rnd(prng, -500_000_000, 500_000_000));
      extra = { asset, range, netUsd };
    } else if (cfg.key === 'longshort') {
      // series2 is also needed for longshort
      series2 = makeSeries(prng, points, 50, 15, intervalMs); // top-trader ~25–75%
    } else if (cfg.key === 'cvd') {
      series2 = makeSeries(prng, points, 0.5, 0.35, intervalMs);
    } else if (cfg.key === 'etf') {
      const net7dUsd = Math.round(rnd(prng, -800_000_000, 800_000_000));
      extra = { asset, range: '30d', net7dUsd };
      // series2 = price overlay for the ETF chart (30 daily price points)
      // Use a realistic BTC price base so the overlay looks sensible regardless
      // of the selected asset — ETF data is always BTC (spot ETF)
      const btcBase = rnd(prng, 60_000, 70_000);
      series2 = makeSeries(prng, ETF_POINTS, btcBase, btcBase * 0.04, ETF_INTERVAL_MS);
    } else if (cfg.key === 'oi') {
      // series2 = price series alongside OI for divergence shading
      const priceBase = rnd(prng, 60_000, 70_000);
      series2 = makeSeries(prng, points, priceBase, priceBase * 0.04, intervalMs);
    }

    // LongShort series: percent scale ~25–75 so ref lines at 30/50/70 fall
    // within the data range and the chart renders without squashing.
    const mainSeries =
      cfg.key === 'longshort'
        ? makeSeries(prng, points, 50, 15, intervalMs) // values ~25–75
        : cfg.key === 'etf'
          ? makeSeries(prng, ETF_POINTS, 0, 300_000_000, ETF_INTERVAL_MS) // ±300M USD flow bars
          : makeSeries(prng, points, 0.5, 0.4, intervalMs);

    panels[cfg.key] = {
      verdict: verdict(cfg.verdictLabel, cfg.color),
      tags: cfg.tags,
      confidence: cfg.confidence,
      updatedAt: isoAgo(rndInt(prng, 60_000, 300_000)),
      headline: cfg.headline(prng),
      series: mainSeries,
      ...(series2 !== undefined ? { series2 } : {}),
      extra,
    };
  }

  return { asset, range, panels };
}

// ---------------------------------------------------------------------------
// Heatmap payload
// ---------------------------------------------------------------------------

const ALL_HEATMAP_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'DOGE', 'LINK', 'APT', 'SUI'];
const FREE_HEATMAP_LIMIT = 5;

export function makeHeatmapPayload(prng: () => number, tier: 'free' | 'pro'): HeatmapPayload {
  const assetsToInclude =
    tier === 'pro' ? ALL_HEATMAP_ASSETS : ALL_HEATMAP_ASSETS.slice(0, FREE_HEATMAP_LIMIT);

  const basePrices: Record<string, number> = {
    BTC: rnd(prng, 60_000, 70_000),
    ETH: rnd(prng, 2_500, 3_500),
    SOL: rnd(prng, 130, 180),
    BNB: rnd(prng, 350, 500),
    AVAX: rnd(prng, 28, 42),
    ARB: rnd(prng, 0.8, 1.4),
    DOGE: rnd(prng, 0.1, 0.2),
    LINK: rnd(prng, 12, 20),
    APT: rnd(prng, 7, 14),
    SUI: rnd(prng, 1.2, 2.5),
  };

  return {
    assets: assetsToInclude.map((asset) => {
      const currentPrice = parseFloat((basePrices[asset] ?? 1).toFixed(4));
      const clusterCount = rndInt(prng, 3, 8);
      return {
        asset,
        currentPrice,
        clusters: Array.from({ length: clusterCount }, () => ({
          price: parseFloat((currentPrice * rnd(prng, 0.85, 1.15)).toFixed(4)),
          volumeUsd: Math.round(rnd(prng, 1_000_000, 200_000_000)),
        })).sort((a, b) => a.price - b.price),
      };
    }),
    // Note: mock pre-caps for free tier; real enforcement is in Task 3.4
    capped: tier === 'free',
  };
}

// ---------------------------------------------------------------------------
// Watchlist payload
// ---------------------------------------------------------------------------

const OVERHEATED_TAGS: Verdict[] = [
  verdict('Overheated Long', 'red'),
  verdict('Breakout Setup', 'green'),
  verdict('Bearish Divergence', 'grey-red'),
  verdict('Support Reclaim', 'grey-green'),
  verdict('Overbought', 'amber'),
  verdict('Range Compression', 'grey'),
];

export function makeWatchlistPayload(
  prng: () => number,
  uid: string,
  tier: 'free' | 'pro'
): WatchlistPayload {
  const slots = tier === 'pro' ? 10 : 4;
  const assetPool = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'DOGE', 'LINK', 'APT', 'SUI'];
  const regimes: WatchlistPayload['assets'][number]['regime'][] = [
    'Trending Up',
    'Trending Down',
    'Coiling',
    'Ranging',
  ];

  const basePrices: Record<string, [number, number]> = {
    BTC: [60_000, 70_000],
    ETH: [2_500, 3_500],
    SOL: [130, 180],
    BNB: [350, 500],
    AVAX: [28, 42],
    ARB: [0.8, 1.4],
    DOGE: [0.1, 0.2],
    LINK: [12, 20],
    APT: [7, 14],
    SUI: [1.2, 2.5],
  };

  const count = tier === 'pro' ? Math.min(slots, assetPool.length) : 4;

  // Seed asset selection from uid hash for "personalisation" feel
  const uidHash = uid.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shuffled = [...assetPool].sort(
    (a, b) => ((uidHash * a.charCodeAt(0)) % 17) - ((uidHash * b.charCodeAt(0)) % 17)
  );

  return {
    slots,
    assets: shuffled.slice(0, count).map((asset, i) => {
      const [min, max] = basePrices[asset] ?? [1, 2];
      const tagCount = rndInt(prng, 0, 2); // max 2 tags per asset
      // Guarantee at least one amber/red "Overheated Long" style tag across the list
      const tags =
        i === 0
          ? [verdict('Overheated Long', 'red'), verdict('Overbought', 'amber')].slice(0, Math.max(1, tagCount))
          : Array.from({ length: tagCount }, () => pick(prng, OVERHEATED_TAGS));

      return {
        asset,
        price: parseFloat(rnd(prng, min, max).toFixed(asset === 'BTC' ? 2 : 4)),
        change24h: parseFloat(rnd(prng, -8, 12).toFixed(2)),
        regime: pick(prng, regimes),
        actionTags: tags,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Intelligence payload
// ---------------------------------------------------------------------------

export function makeIntelligencePayload(
  prng: () => number,
  tier: 'free' | 'pro'
): IntelligencePayload {
  const allBriefs = [
    {
      id: `intel-a1-${hourSeed()}`,
      tier: 'A' as const,
      headline: 'Fed minutes signal pause — risk assets pricing in rate-cut delay',
      category: 'Macro',
      source: 'Federal Reserve / Bloomberg',
      summary:
        'FOMC minutes revealed broad committee consensus to hold rates steady into Q3. Risk assets pulled back modestly; crypto correlated with equities on the news before recovering.',
      proInterpretation:
        'Rate-cut delay typically compresses multiple for risk assets short-term. Watch BTC dominance: if it climbs above 55% while price holds, that is a historically constructive rotation signal.',
      assets: ['BTC', 'ETH', 'SPX'],
      ts: isoAgo(rnd(prng, 1_800_000, 7_200_000)),
    },
    {
      id: `intel-a2-${hourSeed()}`,
      tier: 'A' as const,
      headline: 'BlackRock BTC ETF records largest single-day inflow since January',
      category: 'ETF Flows',
      source: 'Bloomberg',
      summary:
        'IBIT saw $620M in net inflows yesterday, the largest since the ETF launch surge. Total AUM across US BTC ETFs now exceeds $58B.',
      proInterpretation:
        'Sustained ETF inflows of this magnitude historically precede 2–4 week momentum continuation phases. Spot demand is real — watch for futures premium to expand as a confirmation.',
      assets: ['BTC'],
      ts: isoAgo(rnd(prng, 3_600_000, 14_400_000)),
    },
    {
      id: `intel-b1-${hourSeed()}`,
      tier: 'B' as const,
      headline: 'SOL ecosystem TVL surpasses $8B — DeFi activity accelerating',
      category: 'On-Chain',
      source: 'DeFiLlama',
      summary:
        'Total value locked on Solana-based protocols crossed $8B, driven by Kamino Finance and Raydium V3 deployment. Daily active addresses at 6-month highs.',
      proInterpretation:
        'TVL expansion with rising active addresses is a healthy growth signal for SOL token value accrual. Monitor for any smart-contract exploit risk given pace of new deployments.',
      assets: ['SOL'],
      ts: isoAgo(rnd(prng, 7_200_000, 21_600_000)),
    },
    {
      id: `intel-b2-${hourSeed()}`,
      tier: 'B' as const,
      headline: 'Tether prints $1B USDT on Tron — dry powder signal for alt season',
      category: 'Stablecoin',
      source: 'Whale Alert / Tether',
      summary:
        'Tether minted $1B USDT on the Tron network. Stablecoin supply expansion has historically preceded price appreciation across altcoins within 2–4 weeks.',
      assets: ['BTC', 'ETH', 'SOL'],
      ts: isoAgo(rnd(prng, 10_800_000, 28_800_000)),
    },
    {
      id: `intel-c1-${hourSeed()}`,
      tier: 'C' as const,
      headline: 'Minor network upgrade scheduled for ETH mainnet — no disruption expected',
      category: 'Protocol',
      source: 'Ethereum Foundation',
      summary:
        'A routine EIP implementation is scheduled for the next epoch boundary. Core devs confirm no hard fork; validators advised to update clients within 72 hours.',
      assets: ['ETH'],
      ts: isoAgo(rnd(prng, 14_400_000, 43_200_000)),
    },
    {
      id: `intel-c2-${hourSeed()}`,
      tier: 'C' as const,
      headline: 'Binance adjusts margin requirements for BNB perpetuals',
      category: 'Exchange',
      source: 'Binance',
      summary:
        'Binance raised initial margin requirements for BNB-PERP from 1% to 1.5% effective in 48 hours, citing volatility. Minor impact expected on retail positioning.',
      assets: ['BNB'],
      ts: isoAgo(rnd(prng, 21_600_000, 72_000_000)),
    },
  ];

  // Free tier: strip proInterpretation
  const briefs = tier === 'free'
    ? allBriefs.map(({ proInterpretation: _pi, ...b }) => b)
    : allBriefs;

  return { briefs };
}

// ---------------------------------------------------------------------------
// Public factory — returns all fixture makers bound to current hour seed
// ---------------------------------------------------------------------------

export function createFixtures(seed?: number) {
  const s = seed ?? hourSeed();
  const prng = makePrng(s);
  return {
    seed: s,
    prng,
    makeConsolePayload: () => makeConsolePayload(prng),
    makeOnChainPayload: (asset: string, range: '24h' | '7d' | '30d') =>
      makeOnChainPayload(prng, asset, range),
    makeHeatmapPayload: (tier: 'free' | 'pro') => makeHeatmapPayload(prng, tier),
    makeFlowEvents: (count: number) => makeFlowEvents(prng, count),
    makeWatchlistPayload: (uid: string, tier: 'free' | 'pro') =>
      makeWatchlistPayload(prng, uid, tier),
    makeIntelligencePayload: (tier: 'free' | 'pro') => makeIntelligencePayload(prng, tier),
  };
}

// Ensure all Verdict colors appear at least once — verified by test
export { ALL_COLORS };
