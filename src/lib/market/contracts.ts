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
      /** null until macro data source is wired */
      dxy: { value: number; dayChange: number } | null;
      onChainBias: { pctLong: number; ratio: number };
      liq24h: { totalUsd: number; pctVsAvg7d: number };
    };
  };
  /** Exactly 5 chips: BTC, ETH, SOL, GOLD, SPX */
  regimeChips: {
    asset: 'BTC' | 'ETH' | 'SOL' | 'GOLD' | 'SPX';
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
