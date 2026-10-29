/**
 * Kumami's own Fear & Greed history (Rachelle v1.17 Plus §4): the collector saves Kumami's
 * score once a day (fear_greed_daily/{YYYY-MM-DD}, UTC date). Until 30 days are saved the
 * chart keeps the market index series, labelled "Market index" (no provider name); from 30
 * days it shows Kumami's own scores.
 */
import type { Series } from '../contracts';

export const OWN_HISTORY_MIN_DAYS = 30;

/** The UTC calendar date a daily score is saved under. */
export function fearGreedDayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export type SavedFearGreedDay = { date: string; score: number };

export function chooseFearGreedHistory(
  own: SavedFearGreedDay[],
  market: Series,
): { history: Series; source: 'kumami' | 'market'; ownDays: number } {
  const points = own
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date) && Number.isFinite(d.score))
    .map((d) => ({ t: Date.parse(`${d.date}T00:00:00Z`), v: d.score }))
    .sort((a, b) => a.t - b.t);
  if (points.length >= OWN_HISTORY_MIN_DAYS) return { history: points, source: 'kumami', ownDays: points.length };
  return { history: market, source: 'market', ownDays: points.length };
}
