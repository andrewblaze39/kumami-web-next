/**
 * Spot Pulse engine — Rachelle v1.15 Plus §2.9 (one engine for the Plus tile,
 * the Console preview and Spot Pulse Pro). Pure: the builder passes 1H flows
 * and prices; every threshold lives here.
 *
 * Answers, per coin: is a move backed by real spot buying, or by futures leverage?
 *
 *   flow per bar        = taker buy − taker sell (never a difference of cum_vol_delta)
 *   window              = 4H (4 bars) · 24H (24) · 7D (168)
 *   normal swing        = std-dev of the PAST windows of the same length:
 *                         4H → last 42 · 24H → last 30 · 7D → last 11
 *   flow direction      = UP / DOWN only beyond 0.5× the normal swing (z ±0.5), else FLAT
 *   < 8 past windows    = "Not enough history": BALANCED, left out of the market verdict
 *   price band          = 4H ±0.75% · 24H ±1.5% · 7D ±4%
 *
 * v1.14 used "±2% of std-dev" (FLAT almost never happened) and ±1% price for
 * every window, and its verdict table had holes (8 rows).
 */

export type SpotDir = 'UP' | 'FLAT' | 'DOWN';
export type SpotTimeframe = '4H' | '24H' | '7D';

export type SpotVerdict =
  | 'REAL BUYING'
  | 'ACCUMULATION'
  | 'REVERSAL SETUP'
  | 'SPECULATIVE'
  | 'FORCED DECLINE'
  | 'DISTRIBUTION'
  | 'QUIET DISTRIBUTION'
  | 'COHERENT DECLINE'
  | 'BALANCED';

/** Per-tile colours (§3 Per-Tile Color Mapping); QUIET DISTRIBUTION is a softer DISTRIBUTION. */
export const SPOT_COLORS: Record<SpotVerdict, string> = {
  'REAL BUYING': '#46e3a0',
  ACCUMULATION: 'rgba(70,227,160,0.7)',
  'REVERSAL SETUP': '#5ee9a8',
  SPECULATIVE: '#f0b65e',
  'FORCED DECLINE': 'rgba(240,182,94,0.7)',
  DISTRIBUTION: '#ff6b81',
  'QUIET DISTRIBUTION': 'rgba(255,107,129,0.7)',
  'COHERENT DECLINE': '#b04d5d',
  BALANCED: 'rgba(120,200,170,0.15)',
};

/** REVERSAL SETUP gets a subtle glow border (§3). */
export const SPOT_GLOW: SpotVerdict = 'REVERSAL SETUP';

export const WINDOW_BARS: Record<SpotTimeframe, number> = { '4H': 4, '24H': 24, '7D': 168 };
export const PAST_WINDOWS: Record<SpotTimeframe, number> = { '4H': 42, '24H': 30, '7D': 11 };
export const PRICE_BAND_PCT: Record<SpotTimeframe, number> = { '4H': 0.75, '24H': 1.5, '7D': 4 };
export const MIN_PAST_WINDOWS = 8;
export const FLOW_Z = 0.5;

// ── Directional classification ───────────────────────────────────────────────

export function classifyPrice(pct: number, tf: SpotTimeframe): SpotDir {
  const band = PRICE_BAND_PCT[tf];
  if (pct > band) return 'UP';
  if (pct < -band) return 'DOWN';
  return 'FLAT';
}

/** UP / DOWN only beyond 0.5× the normal swing. A zero swing can't call a direction. */
export function classifyFlow(delta: number, swing: number): SpotDir {
  if (!(swing > 0)) return 'FLAT';
  if (delta > FLOW_Z * swing) return 'UP';
  if (delta < -FLOW_Z * swing) return 'DOWN';
  return 'FLAT';
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

/**
 * Current window sum + the normal swing from the preceding same-length windows.
 * `flows` is oldest → newest, one value per 1H bar. `pastWindows` = how many full
 * past windows were available (capped at the spec's count).
 */
export function windowStats(flows: number[], tf: SpotTimeframe): { delta: number; swing: number; pastWindows: number } {
  const n = WINDOW_BARS[tf];
  if (flows.length < n) return { delta: 0, swing: 0, pastWindows: 0 };
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
  const delta = sum(flows.slice(-n));
  const past: number[] = [];
  for (let end = flows.length - n; end - n >= 0 && past.length < PAST_WINDOWS[tf]; end -= n) {
    past.push(sum(flows.slice(end - n, end)));
  }
  return { delta, swing: stddev(past), pastWindows: past.length };
}

// ── Per-coin verdict: all 27 combinations, first match wins ──────────────────

/** r = spot share = |spot Δ| ÷ |futures Δ|. */
export function verdictFor(price: SpotDir, spot: SpotDir, fut: SpotDir, r: number): SpotVerdict {
  if (price === 'UP' && spot === 'UP' && fut !== 'UP') return 'REAL BUYING'; // spot-led
  if (price === 'UP' && spot === 'UP' && fut === 'UP') return r > 0.4 ? 'REAL BUYING' : 'SPECULATIVE';
  if (price === 'UP' && spot === 'FLAT' && fut === 'UP') return 'SPECULATIVE';
  if (price === 'UP' && spot === 'DOWN') return 'DISTRIBUTION';
  if (price === 'FLAT' && spot === 'UP') return 'ACCUMULATION';
  if (price === 'FLAT' && spot === 'DOWN') return 'QUIET DISTRIBUTION';
  if (price === 'DOWN' && spot === 'UP') return 'REVERSAL SETUP';
  if (price === 'DOWN' && spot === 'DOWN') return 'COHERENT DECLINE';
  if (price === 'DOWN' && spot === 'FLAT' && fut === 'DOWN') return 'FORCED DECLINE';
  return 'BALANCED';
}

export type SpotPulseInputs = {
  timeframe: SpotTimeframe;
  /** % price change over the window. */
  priceChangePct: number;
  /** Spot / futures flow over the window (USD, + buy / − sell). */
  spotDelta: number;
  futDelta: number;
  /** Normal swings (std-dev of past same-length windows). */
  spotSwing: number;
  futSwing: number;
  /** Past windows available for the spot side (< 8 → not enough history). */
  pastWindows: number;
};

export type SpotVerdictResult = {
  verdict: SpotVerdict;
  color: string;
  glow: boolean;
  priceDir: SpotDir;
  spotDir: SpotDir;
  futDir: SpotDir;
  /** |spot Δ| / |futures Δ| (999 when futures is 0). */
  spotToFutRatio: number;
  /** True when the coin has fewer than 8 past windows — reads BALANCED, excluded from the market verdict. */
  notEnoughHistory: boolean;
};

export function computeSpotVerdict(x: SpotPulseInputs): SpotVerdictResult {
  const priceDir = classifyPrice(x.priceChangePct, x.timeframe);
  const spotDir = classifyFlow(x.spotDelta, x.spotSwing);
  const futDir = classifyFlow(x.futDelta, x.futSwing);
  const absSpot = Math.abs(x.spotDelta);
  const absFut = Math.abs(x.futDelta);
  const ratio = absFut > 0 ? absSpot / absFut : absSpot > 0 ? Infinity : 0;
  const notEnoughHistory = x.pastWindows < MIN_PAST_WINDOWS;
  const verdict = notEnoughHistory ? 'BALANCED' : verdictFor(priceDir, spotDir, futDir, ratio);
  return {
    verdict,
    color: SPOT_COLORS[verdict],
    glow: verdict === SPOT_GLOW,
    priceDir,
    spotDir,
    futDir,
    spotToFutRatio: Number.isFinite(ratio) ? ratio : 999,
    notEnoughHistory,
  };
}

// ── Market verdict: shares of tiles with data (same rules for 5 and 10 tiles) ─

export type MarketVerdict =
  | 'Broad Buying'
  | 'Distribution Wave'
  | 'Broad Selloff'
  | 'Selective Accumulation'
  | 'Speculation Dominant'
  | 'Mixed Market'
  | 'Not enough data';

const BULLISH = new Set<SpotVerdict>(['REAL BUYING', 'ACCUMULATION', 'REVERSAL SETUP']);
const BEARISH = new Set<SpotVerdict>(['DISTRIBUTION', 'QUIET DISTRIBUTION', 'COHERENT DECLINE', 'FORCED DECLINE']);
const DISTRIBUTING = new Set<SpotVerdict>(['DISTRIBUTION', 'QUIET DISTRIBUTION']);
const DECLINING = new Set<SpotVerdict>(['COHERENT DECLINE', 'FORCED DECLINE']);

/** `verdicts` = tiles WITH data only (no "not enough history", no failed fetches). */
export function computeMarketVerdict(verdicts: SpotVerdict[]): MarketVerdict {
  const n = verdicts.length;
  if (n < 4) return 'Not enough data';
  const share = (pred: (v: SpotVerdict) => boolean) => verdicts.filter(pred).length / n;
  const bullish = share((v) => BULLISH.has(v));
  const bearish = share((v) => BEARISH.has(v));
  const distributing = share((v) => DISTRIBUTING.has(v));

  if (bullish >= 0.6 && bearish <= 0.2) return 'Broad Buying';
  // Bearish states are checked before speculation (v1.14 checked speculation first).
  if (distributing >= 0.4) return 'Distribution Wave';
  if (share((v) => DECLINING.has(v)) >= 0.4) return 'Broad Selloff';
  if (share((v) => v === 'ACCUMULATION') >= 0.4 && distributing === 0) return 'Selective Accumulation';
  if (share((v) => v === 'SPECULATIVE') >= 0.4) return 'Speculation Dominant';
  return 'Mixed Market';
}

/** Template one-liner per market verdict (the AI layer will rewrite these later). */
export const MARKET_SENTENCE: Record<MarketVerdict, string> = {
  'Broad Buying': 'Real spot demand is broad across majors — buyers are leading, not chasing leverage.',
  'Distribution Wave': 'Spot is selling into strength or flat prices across the board — a distribution setup.',
  'Broad Selloff': 'Coherent selling across the board — spot and futures both heading for the exit.',
  'Selective Accumulation': 'Quiet spot accumulation in a few names while price sits flat — patient buyers at work.',
  'Speculation Dominant': 'Moves are running on futures leverage with thin spot support — treat rallies with caution.',
  'Mixed Market': 'No single force in control — spot and futures signals are split across coins.',
  'Not enough data': 'Too few coins have enough data for a market-wide read right now.',
};

/** Divergence score for the bottom alert cards (§5 Selection Logic; QUIET DISTRIBUTION +4 in v1.15). */
export function divergenceScore(
  v: SpotVerdictResult,
  opts: { asset: string; spotDelta: number; priceChangePct: number; isDynamicRow2?: boolean },
): number {
  let s = 0;
  if (v.verdict === 'DISTRIBUTION') s += 5;
  if (v.verdict === 'QUIET DISTRIBUTION') s += 4;
  if (v.verdict === 'SPECULATIVE' && v.spotToFutRatio < 0.2) s += 4;
  if (v.verdict === 'ACCUMULATION') s += 4;
  if (v.verdict === 'REVERSAL SETUP') s += 3;
  if (v.verdict === 'REAL BUYING' && opts.spotDelta > 50_000_000) s += 2;
  const anchor = opts.asset === 'BTC' || opts.asset === 'ETH';
  if (anchor) s *= 1.3;
  if (opts.isDynamicRow2) s *= 1.2;
  return s;
}
