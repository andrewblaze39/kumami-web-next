/**
 * Radar Watchlist auto-scorer.
 *
 * Sources: doc lines 161–174 (Console section 6, Watchlist).
 *
 * Algorithm (doc lines 163–168):
 *   1. Take all Flow Radar events from last 24h.
 *   2. Filter to bullish-lean events:
 *        directions: Outflow, Accumulation, Smart Money.
 *   3. Group by asset, score = sum of event severity:
 *        HIGH = 3, MED = 1.
 *      Weighted by recency: events < 6h old get ×1.5 multiplier.
 *   4. Rank by score, take top 4.
 *   5. Display: asset, price, 24h change, and the triggering signal.
 *
 * Recency:
 *   The multiplier is applied against a `now` timestamp passed in.
 *   This keeps the function pure (no Date.now() inside logic).
 *   If `event.ts` is within 6 hours of `now`, score × 1.5.
 *
 * Signal label for display (step 5):
 *   The doc shows examples like "Whale Accumulation", "Smart Money Long",
 *   "Exchange Outflow".  The signal label is derived from the event's
 *   type + direction combination:
 *     direction "Smart Money"  → "Smart Money Long"
 *     direction "Accumulation" → "Whale Accumulation"
 *     direction "Outflow" + type "whale_transfer" → "Whale Outflow"
 *     direction "Outflow" + type "exchange_flow"  → "Exchange Outflow"
 *     direction "Outflow" + other                 → "Exchange Outflow"
 *
 * Tiebreaking: ties are broken by asset name alphabetically (stable sort
 * is sufficient since assets within a tie do not have a doc-defined order).
 *
 * Boundary decisions:
 *   - "< 6h old" means strictly less than 6 hours (21600 seconds).
 *     An event exactly 6 hours old does NOT get the recency multiplier.
 *   - TOP_N is 4 (doc says "top 4").
 *   - The bullish-lean filter is an exact match on the three directions
 *     listed in the doc: "Outflow", "Accumulation", "Smart Money".
 */

import type { FlowEvent } from '../contracts';

/** Minimum event facts needed by this engine — a subset of FlowEvent. */
export type WatchlistEvent = {
  type: FlowEvent['type'];
  asset: string;
  direction: FlowEvent['direction'];
  severity: FlowEvent['severity'];
  ts: string; // ISO timestamp
};

export type WatchlistInputs = {
  /** All Flow Radar events from the last 24h. */
  events: WatchlistEvent[];
  /**
   * Current timestamp as unix ms. Used to compute recency without
   * any Date.now() calls inside the engine.
   */
  now: number;
};

export type WatchlistEntry = {
  asset: string;
  /** Triggering signal label for display (e.g. "Smart Money Long"). */
  signal: string;
  /** Aggregate score (for debugging/sorting transparency). */
  score: number;
};

export type RadarWatchlistResult = {
  /** Top 4 entries, ranked by score descending. */
  entries: WatchlistEntry[];
};

const TOP_N = 4;
const RECENCY_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h in ms
const RECENCY_MULTIPLIER = 1.5;

const SEVERITY_SCORE: Record<FlowEvent['severity'], number> = {
  HIGH: 3,
  MED:  1,
  LOW:  0,
};

const BULLISH_DIRECTIONS = new Set<FlowEvent['direction']>([
  'Outflow',
  'Accumulation',
  'Smart Money',
]);

function signalLabel(event: WatchlistEvent): string {
  if (event.direction === 'Smart Money')   return 'Smart Money Long';
  if (event.direction === 'Accumulation')  return 'Whale Accumulation';
  if (event.direction === 'Outflow') {
    if (event.type === 'whale_transfer') return 'Whale Outflow';
    return 'Exchange Outflow';
  }
  return 'Bullish Signal';
}

export function computeRadarWatchlist(inputs: WatchlistInputs): RadarWatchlistResult {
  const { events, now } = inputs;

  // Step 1+2: filter to bullish-lean events
  const bullish = events.filter(e => BULLISH_DIRECTIONS.has(e.direction));

  // Step 3: group by asset and accumulate weighted scores
  const assetScores = new Map<string, { score: number; topSignal: string; topSeverity: number }>();

  for (const event of bullish) {
    const base = SEVERITY_SCORE[event.severity];
    const eventMs = Date.parse(event.ts);
    const ageMs = now - eventMs;
    const multiplier = ageMs < RECENCY_WINDOW_MS ? RECENCY_MULTIPLIER : 1;
    const contribution = base * multiplier;

    const existing = assetScores.get(event.asset);
    const label = signalLabel(event);
    const sevNum = SEVERITY_SCORE[event.severity];

    if (!existing) {
      assetScores.set(event.asset, { score: contribution, topSignal: label, topSeverity: sevNum });
    } else {
      existing.score += contribution;
      // Keep track of the highest-severity event's label for display
      if (sevNum > existing.topSeverity) {
        existing.topSignal = label;
        existing.topSeverity = sevNum;
      }
    }
  }

  // Step 4: filter zero-score assets (LOW-only), rank, take top 4
  // PM doc line ~142: LOW-severity events are "filtered out" — an asset whose only
  // events are LOW contributes score=0 and must not occupy a top-4 slot.
  const ranked = Array.from(assetScores.entries())
    .map(([asset, data]) => ({
      asset,
      signal: data.topSignal,
      score: data.score,
    }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.asset.localeCompare(b.asset));

  return { entries: ranked.slice(0, TOP_N) };
}
