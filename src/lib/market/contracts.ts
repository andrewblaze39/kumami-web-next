/**
 * Canonical panel data contracts for the /world market-data platform.
 * These types are the shared language between providers, rule engines, and UI panels.
 * Rule engines, cache, gating, API routes, and UI are built in later tasks.
 */

/** A labelled colour chip used for verdicts and modifier tags. */
export type Verdict = {
  label: string;
  color: 'green' | 'grey-green' | 'grey' | 'amber' | 'grey-red' | 'red';
};

/** Top-level outcome for any panel — verdict + optional enrichment. */
export type PanelVerdict = {
  verdict: Verdict;
  /** Modifier chips, e.g. "· Rising Fast", "· Smart Money Fading" */
  tags: Verdict[];
  /** 0–1 confidence score */
  confidence?: number;
  /** LLM-generated 1–2 sentence interpretation (null until Phase 6 or mocked) */
  interpretation?: string;
  /** ISO timestamp — every panel shows last-updated */
  updatedAt: string;
};

/** Time-series data points: t = unix ms, v = numeric value. */
export type Series = { t: number; v: number }[];

/** Full payload for the /world Console page. */
export type ConsolePayload = {
  marketConditions: PanelVerdict & {
    fearGreed: number;
    /** Server-derived label for the Fear & Greed value (e.g. "Extreme Greed"). */
    fearGreedLabel: string;
    /** Server-derived color token for the Fear & Greed bar fill. */
    fearGreedColor: 'green' | 'lime' | 'grey' | 'amber' | 'red';
    tiles: {
      etfFlow7d: { usd: number; pctVsPrev: number };
      /** BTC's share of total crypto market cap (CoinGecko), replacing the DXY slot. */
      btcDominance: { pct: number; dayChange: number } | null;
      onChainBias: { pctLong: number; ratio: number };
      liq24h: { totalUsd: number; pctVsAvg7d: number };
    };
  };
  /** Exactly 5 chips: BTC, ETH, SOL, BNB, HYPE */
  regimeChips: {
    asset: 'BTC' | 'ETH' | 'SOL' | 'BNB' | 'HYPE';
    price: number;
    change24h: number;
    regime: 'Bullish' | 'Neutral' | 'Bearish';
    confidence: number;
  }[];
  heatmapPreview: { asset: string; liqUsd24h: number; longShare: number }[];
  /** Last 6 flow events */
  flowRadar: FlowEvent[];
  /** Top 4 intel briefs — no summaries on console */
  intelPreview: {
    tier: 'A' | 'B' | 'C';
    headline: string;
    category: string;
    source: string;
    ts: string;
  }[];
  /** Up to 4 auto-selected watchlist items */
  radarWatchlist: {
    asset: string;
    price: number;
    change24h: number;
    signal: string;
  }[];
};

/** A discrete market flow / on-chain event. */
export type FlowEvent = {
  id: string;
  type:
    | 'whale_transfer'
    | 'exchange_flow'
    | 'liq_spike'
    | 'netflow_flip'
    | 'whale_wall'
    | 'smart_money';
  asset: string;
  amountUsd: number;
  direction:
    | 'Inflow'
    | 'Outflow'
    | 'Accumulation'
    | 'Smart Money'
    | 'Buy Pressure'
    | 'Sell Pressure'
    | 'Resistance Wall'
    | 'Support Wall';
  severity: 'HIGH' | 'MED' | 'LOW';
  description: string;
  ts: string;
  interpretation?: string;
};

/** One sub-metric tile on the Fear & Greed page. */
export type FearGreedSubMetric = {
  /** 0-100, already mapped through the sub-metric's own scoring bands. */
  score: number;
  /** Raw display value — a number (%, $) or a label (e.g. "Low" for volatility). */
  value: number | string;
  label: string;
  /** Small caption crediting the data source, e.g. "CoinGecko · tracked basket". */
  source: string;
  /** True only for News Tone until its LLM classification is validated. */
  estimated?: boolean;
};

/** Full payload for the standalone /world/fear-greed page (Plus tier). */
export type FearGreedPayload = {
  composite: { score: number; label: string; color: Verdict['color'] };
  subMetrics: {
    priceMomentum: FearGreedSubMetric;
    longShortSentiment: FearGreedSubMetric;
    volatility: FearGreedSubMetric;
    marketComposition: FearGreedSubMetric;
    newsTone: FearGreedSubMetric;
  };
  /** Raw index history (proxy trend line) — { t: ms epoch, v: 0-100 }. */
  history: Series;
  updatedAt: string;
};

/** One event on the standalone /world/calendar page. */
export type CalendarEvent = {
  id: string;
  type: 'macro' | 'unlock' | 'protocol';
  title: string;
  /** ISO timestamp — may be past (unlocks/econ prints) or future (scheduled). */
  ts: string;
  impact: 'HIGH' | 'MED' | 'LOW';
  assets: string[];
  description: string;
};

/** Full payload for the standalone /world/calendar page (Plus tier). */
export type CalendarPayload = {
  events: CalendarEvent[];
  updatedAt: string;
};

/** Full payload for the standalone /world/flow-radar page (Plus tier: fixed 5-asset roster, HIGH+MED only). */
export type FlowRadarPayload = {
  events: FlowEvent[];
  verdict: Verdict;
  sentence: string;
  statLine: string;
  footer: {
    eventCount: number;
    totalUsd: number;
    assets: string[];
  };
  updatedAt: string;
};

/** Keys for the 10 on-chain metric panels. */
export type MetricPanelKey =
  | 'funding'
  | 'liquidations'
  | 'netflow'
  | 'longshort'
  | 'heatmap'
  | 'cvd'
  | 'premium'
  | 'etf'
  | 'oi'
  | 'stablecoin';

/** A single large open leveraged position (Hyperliquid) for the Whale Position Tracker. */
export type WhalePosition = {
  /** Shortened wallet address, e.g. "0xcb84…52cd". */
  user: string;
  side: 'Long' | 'Short';
  sizeUsd: number;
  entryPrice: number;
  liqPrice: number;
  /** Signed % move from current price to the liquidation price (negative = liq below). */
  distanceToLiqPct: number;
};

/** One asset tile in the Spot Pulse grid. */
export type SpotPulseTile = {
  asset: string;
  /** Verdict label, e.g. "REAL BUYING", "DISTRIBUTION", "BALANCED". */
  verdict: string;
  /** Exact tile colour (hex or rgba) from the spec. */
  color: string;
  /** REVERSAL SETUP gets a glow border. */
  glow: boolean;
  priceChange4h: number;
  spotCvdChange: number;
  futCvdChange: number;
  spotToFutRatio: number;
  /** 1 = fixed anchor, 2 = dynamic trending (Pro). */
  row: 1 | 2;
  /** True when the asset lacked enough data and defaulted to BALANCED. */
  insufficient?: boolean;
};

/** A divergence alert card below the grid. */
export type SpotPulseAlert = {
  asset: string;
  verdict: string;
  color: string;
  line1: string;
  line2: string;
  /** Cross-signal confirmation tag (§10), when present. */
  confirm?: string;
};

/** Full payload for the Spot Pulse panel (replaces the liquidation heatmap slot). */
export type SpotPulsePayload = {
  tier: 'plus' | 'pro';
  timeframe: '4H' | '24H' | '7D';
  marketVerdict: string;
  marketSentence: string;
  tiles: SpotPulseTile[];
  alerts: SpotPulseAlert[];
  footer: {
    /** null until per-asset spot volume (spot/coins-markets) is on the plan. */
    totalSpotVol24h: number | null;
    netSpotFlow: number;
    divergenceCount: number;
    /** Aggregate 1h spot exchange netflow across tiles (+ = out of exchanges = bullish). null if unavailable. */
    spotNetflow: number | null;
  };
  updatedAt: string;
};

/** Full payload for the /world On-Chain page for a given asset + range. */
export type OnChainPayload = {
  asset: string;
  range: '24h' | '7d' | '30d';
  panels: Record<
    MetricPanelKey,
    PanelVerdict & {
      headline: string;
      series?: Series;
      series2?: Series;
      extra?: Record<string, number | string>;
    }
  >;
  /**
   * Top open whale positions for this asset (Hyperliquid) — powers the Whale
   * Position Tracker that replaces the tier-locked liquidation heatmap slot.
   */
  whalePositions?: WhalePosition[];
};

/** Liquidation heatmap payload. */
export type HeatmapPayload = {
  assets: {
    asset: string;
    currentPrice: number;
    clusters: { price: number; volumeUsd: number }[];
  }[];
  /** true when the result is capped for free-tier users */
  capped: boolean;
};

/** Watchlist payload for a user. */
export type WatchlistPayload = {
  slots: number;
  assets: {
    asset: string;
    price: number;
    change24h: number;
    regime: 'Trending Up' | 'Trending Down' | 'Coiling' | 'Ranging';
    /** Maximum 2 tags per asset */
    actionTags: Verdict[];
  }[];
};

/** Intelligence / briefs payload. */
export type IntelligencePayload = {
  briefs: {
    id: string;
    tier: 'A' | 'B' | 'C';
    headline: string;
    category: string;
    source: string;
    summary: string;
    /**
     * Always present on every brief. True when a PRO interpretation exists
     * for this brief (regardless of whether the text was stripped for free tier).
     * Client uses this flag to decide whether to render the locked shell.
     */
    hasProInterpretation: boolean;
    proInterpretation?: string;
    assets: string[];
    ts: string;
  }[];
};

/**
 * Extended GET response from /api/market/watchlist.
 * Exported so both the route and the page share one canonical type.
 */
export type WatchlistApiResponse = {
  /** null = unlimited (pro); Infinity serialised as null for JSON wire format */
  slots: number | null;
  assets: WatchlistPayload['assets'];
  curatedSymbols: string[];
  curatedAssets: WatchlistPayload['assets'];
};
