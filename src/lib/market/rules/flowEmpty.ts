/**
 * Flow Radar empty-list line (Rachelle v1.17 Plus §3). Plus only shows HIGH/MED events, so an
 * empty window means a quiet market: "No major flows in the last {window} — market is quiet".
 * When events exist but the user's filters hide them, say that instead.
 */
const WINDOW_WORDS: Record<string, string> = { '1H': 'hour', '4H': '4 hours', '24H': '24 hours', '7D': '7 days' };

export function flowEmptyMessage(o: { plus: boolean; eventsInWindow: number; timeframe: string }): string {
  if (o.eventsInWindow > 0) return 'No events match these filters right now.';
  const w = WINDOW_WORDS[o.timeframe] ?? o.timeframe;
  return o.plus ? `No major flows in the last ${w} — market is quiet` : `No events in the last ${w}.`;
}
