import { describe, it, expect } from 'vitest';
import { chooseFearGreedHistory, fearGreedDayKey, OWN_HISTORY_MIN_DAYS } from '../fearGreedHistory';

// Rachelle v1.17 Plus §4 "Own history": save Kumami's score once a day. Until 30 days are saved,
// keep the current chart but label it "Market index" (no provider name); after 30, Kumami's own.
describe('chooseFearGreedHistory', () => {
  const market = [{ t: Date.UTC(2026, 9, 1), v: 40 }, { t: Date.UTC(2026, 9, 2), v: 45 }];
  const own = (n: number) => Array.from({ length: n }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, score: 50 + i }));

  it('needs 30 saved days', () => {
    expect(OWN_HISTORY_MIN_DAYS).toBe(30);
  });

  it('under 30 saved days: the market index series, labelled as such', () => {
    const r = chooseFearGreedHistory(own(29), market);
    expect(r.source).toBe('market');
    expect(r.history).toBe(market);
    expect(r.ownDays).toBe(29);
  });

  it('from 30 saved days: Kumami\'s own scores, oldest first, one point per day at 00:00 UTC', () => {
    const r = chooseFearGreedHistory([...own(30)].reverse(), market);
    expect(r.source).toBe('kumami');
    expect(r.history).toHaveLength(30);
    expect(r.history[0]).toEqual({ t: Date.UTC(2026, 9, 1), v: 50 });
    expect(r.history[29].v).toBe(79);
  });

  it('ignores malformed rows', () => {
    const bad = [...own(30), { date: 'nope', score: 10 }, { date: '2026-11-01', score: Number.NaN }];
    expect(chooseFearGreedHistory(bad, market).history).toHaveLength(30);
  });
});

describe('fearGreedDayKey', () => {
  it('is the UTC calendar date', () => {
    expect(fearGreedDayKey(Date.UTC(2026, 9, 29, 23, 59))).toBe('2026-10-29');
    expect(fearGreedDayKey(Date.UTC(2026, 9, 30, 0, 1))).toBe('2026-10-30');
  });
});
