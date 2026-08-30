/**
 * Spot Pulse verdict engine.
 *
 * Source: Rachelle's "Spot Pulse" spec (Kumami Website (5).docx), section 3
 * (per-asset verdict) + section 4 (market-wide verdict). Pure — all thresholds
 * live here; the UI only renders the returned verdict/colour.
 *
 * Answers, per asset: is a move backed by real spot buying, or driven by
 * futures leverage? Compares spot CVD vs futures CVD vs price over a window.
 */

export type SpotDir = 'UP' | 'FLAT' | 'DOWN';

export type SpotVerdict =
  | 'REAL BUYING'
  | 'ACCUMULATION'
  | 'REVERSAL SETUP'
  | 'SPECULATIVE'
  | 'FORCED DECLINE'
  | 'DISTRIBUTION'
  | 'COHERENT DECLINE'
  | 'BALANCED';

/** Exact per-tile colours from the spec (§3 Per-Tile Color Mapping). */
export const SPOT_COLORS: Record<SpotVerdict, string> = {
  'REAL BUYING': '#46e3a0',
  ACCUMULATION: 'rgba(70,227,160,0.7)',
  'REVERSAL SETUP': '#5ee9a8',
  SPECULATIVE: '#f0b65e',
  'FORCED DECLINE': 'rgba(240,182,94,0.7)',
  DISTRIBUTION: '#ff6b81',
  'COHERENT DECLINE': '#b04d5d',
  BALANCED: 'rgba(120,200,170,0.15)',
};

/** REVERSAL SETUP gets a subtle glow border (§3). */
export const SPOT_GLOW: SpotVerdict = 'REVERSAL SETUP';

// ── Directional classification (§3) ──────────────────────────────────────────

/** price_direction: > +1% UP · −1%…+1% FLAT · < −1% DOWN. */
export function classifyPrice(pct: number): SpotDir {
  if (pct > 1) return 'UP';
  if (pct < -1) return 'DOWN';
  return 'FLAT';
}

/**
 * cvd_direction: positive & beyond 2% of the 7-day CVD range → UP; within ±2%
 * of range → FLAT; negative & beyond → DOWN. "7-day CVD range" is the rolling
 * std-dev of 4H CVD deltas (passed in as `range`).
 */
export function classifyCvd(delta: number, range: number): SpotDir {
  const threshold = 0.02 * Math.max(range, 0);
  if (delta > 0 && Math.abs(delta) > threshold) return 'UP';
  if (delta < 0 && Math.abs(delta) > threshold) return 'DOWN';
  return 'FLAT';
}

// ── Per-asset verdict (§3 Verdict Matrix, first match wins) ───────────────────

export type SpotPulseInputs = {
  /** 4H price % change. */
  priceChange4h: number;
  /** Spot CVD 4H delta (USD; +buy / −sell). */
  spotCvdChange: number;
  /** Futures CVD 4H delta (USD). */
  futCvdChange: number;
  /** 7-day range (std-dev of 4H CVD deltas) for spot / futures. */
  spotCvdRange: number;
  futCvdRange: number;
};

export type SpotVerdictResult = {
  verdict: SpotVerdict;
  color: string;
  glow: boolean;
  priceDir: SpotDir;
  spotDir: SpotDir;
  futDir: SpotDir;
  /** |spot_cvd_change| / |fut_cvd_change|. */
  spotToFutRatio: number;
};

export function computeSpotVerdict(x: SpotPulseInputs): SpotVerdictResult {
  const priceDir = classifyPrice(x.priceChange4h);
  const spotDir = classifyCvd(x.spotCvdChange, x.spotCvdRange);
  const futDir = classifyCvd(x.futCvdChange, x.futCvdRange);
  const absSpot = Math.abs(x.spotCvdChange);
  const absFut = Math.abs(x.futCvdChange);
  const spotToFutRatio = absFut > 0 ? absSpot / absFut : absSpot > 0 ? Infinity : 0;

  let verdict: SpotVerdict;
  if (priceDir === 'UP' && spotDir === 'UP' && futDir === 'UP' && spotToFutRatio > 0.4) {
    verdict = 'REAL BUYING';
  } else if (priceDir === 'UP' && spotDir === 'FLAT' && futDir === 'UP') {
    verdict = 'SPECULATIVE';
  } else if (priceDir === 'UP' && spotDir === 'DOWN' && futDir === 'UP') {
    verdict = 'DISTRIBUTION';
  } else if (priceDir === 'FLAT' && spotDir === 'UP') {
    verdict = 'ACCUMULATION';
  } else if (priceDir === 'DOWN' && spotDir === 'UP') {
    verdict = 'REVERSAL SETUP';
  } else if (priceDir === 'DOWN' && spotDir === 'DOWN' && futDir === 'DOWN') {
    verdict = 'COHERENT DECLINE';
  } else if (priceDir === 'DOWN' && spotDir === 'FLAT' && futDir === 'DOWN') {
    verdict = 'FORCED DECLINE';
  } else {
    verdict = 'BALANCED';
  }

  return {
    verdict,
    color: SPOT_COLORS[verdict],
    glow: verdict === SPOT_GLOW,
    priceDir,
    spotDir,
    futDir,
    spotToFutRatio: Number.isFinite(spotToFutRatio) ? spotToFutRatio : 999,
  };
}

// ── Market-wide verdict (§4, thresholds scale with grid size) ─────────────────

export type MarketVerdict =
  | 'Broad Buying'
  | 'Speculation Dominant'
  | 'Distribution Wave'
  | 'Selective Accumulation'
  | 'Broad Selloff'
  | 'Mixed Market';

const BUYING = new Set<SpotVerdict>(['REAL BUYING', 'ACCUMULATION', 'REVERSAL SETUP']);
const DECLINE = new Set<SpotVerdict>(['COHERENT DECLINE', 'FORCED DECLINE']);

export function computeMarketVerdict(verdicts: SpotVerdict[], tier: 'plus' | 'pro'): MarketVerdict {
  const count = (pred: (v: SpotVerdict) => boolean) => verdicts.filter(pred).length;
  const buying = count((v) => BUYING.has(v));
  const speculative = count((v) => v === 'SPECULATIVE');
  const distribution = count((v) => v === 'DISTRIBUTION');
  const accumulation = count((v) => v === 'ACCUMULATION');
  const decline = count((v) => DECLINE.has(v));

  if (tier === 'plus') {
    if (buying >= 3) return 'Broad Buying';
    if (speculative >= 2) return 'Speculation Dominant';
    if (distribution >= 2) return 'Distribution Wave';
    if (accumulation >= 2 && distribution === 0) return 'Selective Accumulation';
    if (decline >= 2) return 'Broad Selloff';
    return 'Mixed Market';
  }
  // pro (10 tiles)
  if (buying >= 6) return 'Broad Buying';
  if (speculative >= 4) return 'Speculation Dominant';
  if (distribution >= 3) return 'Distribution Wave';
  if (accumulation >= 4 && distribution < 2) return 'Selective Accumulation';
  if (decline >= 4) return 'Broad Selloff';
  return 'Mixed Market';
}

/** Hardcoded one-liner per market verdict — fallback until an LLM key exists (§4). */
export const MARKET_SENTENCE: Record<MarketVerdict, string> = {
  'Broad Buying': 'Real spot demand is broad across majors — buyers are leading, not chasing leverage.',
  'Speculation Dominant': 'Moves are running on futures leverage with thin spot support — treat rallies with caution.',
  'Distribution Wave': 'Spot is selling into strength while futures stay long — a classic distribution setup.',
  'Selective Accumulation': 'Quiet spot accumulation in a few names while price sits flat — patient buyers at work.',
  'Broad Selloff': 'Coherent selling across the board — spot and futures both heading for the exit.',
  'Mixed Market': 'No single force in control — spot and futures signals are split across assets.',
};

/** Divergence score for the bottom alert cards (§5 Selection Logic). */
export function divergenceScore(
  v: SpotVerdictResult,
  opts: { asset: string; spotCvdChange: number; priceChange4h: number; isDynamicRow2?: boolean },
): number {
  let s = 0;
  if (v.verdict === 'DISTRIBUTION') s += 5;
  if (v.verdict === 'SPECULATIVE' && v.spotToFutRatio < 0.2) s += 4;
  if (v.verdict === 'ACCUMULATION' && opts.priceChange4h >= -1 && opts.priceChange4h <= 1) s += 4;
  if (v.verdict === 'REVERSAL SETUP') s += 3;
  if (v.verdict === 'REAL BUYING' && opts.spotCvdChange > 50_000_000) s += 2;
  const anchor = opts.asset === 'BTC' || opts.asset === 'ETH';
  if (anchor) s *= 1.3;
  if (opts.isDynamicRow2) s *= 1.2;
  return s;
}
