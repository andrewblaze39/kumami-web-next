/**
 * Calendar event mapping — turns the three Calendar sources into the one
 * CalendarEvent shape the shared /world/calendar page (Plus AND Pro) renders.
 *
 *   1. Macro prints    ← CoinGlass /api/calendar/economic-data   (source 'feed')
 *   2. Token unlocks   ← CoinGlass /api/coin/unlock-list          (source 'feed')
 *   3. Team events     ← Firestore pro_calendar, published only    (source 'kumami')
 *      authored at /admin/pro-calendar — this is the spec's "editorial
 *      pipeline" (Kumami Plus §7.1): admins add/edit/delete events by hand and
 *      they appear on the same calendar as the API feed.
 *
 * Pure functions only (no fetch, no Firestore) so they're unit-testable.
 */

import type { CalendarEvent } from '../contracts';

// ---------------------------------------------------------------------------
// Feed rows (structural subsets of the CoinGlass row types)
// ---------------------------------------------------------------------------

export type MacroRow = {
  calendar_name: string;
  country_code: string;
  data_effect: string;
  forecast_value: string;
  previous_value: string;
  publish_timestamp: number;
  importance_level: number; // 1..3
};

export type UnlockFeedRow = {
  symbol: string;
  name: string;
  market_cap: number;
  next_unlock_date?: number;          // ms epoch
  next_unlock_usd?: number;
  next_unlock_of_circulating?: number; // already a percent, e.g. 0.81 = 0.81%
};

/** Admin-authored pro_calendar document (see components/admin/PublishCalendar). */
export type AdminCalendarDoc = {
  t?: string;            // title
  date?: string;         // YYYY-MM-DD
  time?: string;         // "HH:MM" (UTC) from the time picker; legacy docs may hold free text like "8:30 AM UTC"
  imp?: string;          // 'high' | 'med' | 'low'
  cat?: string;          // Macro | Token unlock | On-chain | Regulatory | Project | Other
  d?: string;            // description
  assets?: string;       // comma-separated tickers, optional
  status?: string;       // only 'published' docs are ever passed in
};

/** Unlocks smaller than this market cap are noise for a 5-asset product. */
export const UNLOCK_MIN_MCAP = 50_000_000;

const toIso = (ts: number) => new Date(ts < 1e12 ? ts * 1000 : ts).toISOString();
const fmtUsd = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${Math.round(v / 1e3)}K`;

// ---------------------------------------------------------------------------
// 1. Macro
// ---------------------------------------------------------------------------

export function macroToEvent(c: MacroRow): CalendarEvent {
  const impact: CalendarEvent['impact'] =
    c.importance_level >= 3 ? 'HIGH' : c.importance_level >= 2 ? 'MED' : 'LOW';
  const fc = c.forecast_value ? ` · forecast ${c.forecast_value}` : '';
  const prev = c.previous_value ? ` · prev ${c.previous_value}` : '';
  return {
    id: `macro-${c.publish_timestamp}-${c.country_code}-${c.calendar_name}`,
    type: 'macro',
    title: `${c.calendar_name} (${c.country_code})`,
    ts: toIso(c.publish_timestamp),
    impact,
    assets: ['BTC'], // macro prints are market-wide; BTC as the Plus-roster proxy
    description: `${c.data_effect || 'Scheduled economic release.'}${fc}${prev}`.trim(),
    source: 'feed',
  };
}

// ---------------------------------------------------------------------------
// 2. Token unlocks — dated on the NEXT unlock, sized by that unlock
// ---------------------------------------------------------------------------

/** HIGH ≥ 5% of circulating supply in one unlock · MED ≥ 1% · else LOW. */
export function unlockImpact(pctOfCirculating: number): CalendarEvent['impact'] {
  return pctOfCirculating >= 5 ? 'HIGH' : pctOfCirculating >= 1 ? 'MED' : 'LOW';
}

/** Returns null when the row has no scheduled next unlock or is too small to matter. */
export function unlockToEvent(u: UnlockFeedRow): CalendarEvent | null {
  if (!u.next_unlock_date || u.next_unlock_date <= 0) return null;
  if (!(u.market_cap > UNLOCK_MIN_MCAP)) return null;
  const pct = u.next_unlock_of_circulating ?? 0;
  const usd = u.next_unlock_usd ?? 0;
  const size = usd > 0 ? `${fmtUsd(usd)} of ${u.symbol} unlocks` : `${u.symbol} tokens unlock`;
  return {
    id: `unlock-${u.symbol}-${u.next_unlock_date}`,
    type: 'unlock',
    title: `${u.name} (${u.symbol}) token unlock`,
    ts: toIso(u.next_unlock_date),
    impact: unlockImpact(pct),
    assets: [u.symbol],
    description: `${size} (${pct.toFixed(2)}% of circulating supply) · market cap ${fmtUsd(u.market_cap)}.`,
    source: 'feed',
  };
}

// ---------------------------------------------------------------------------
// 3. Admin-authored events
// ---------------------------------------------------------------------------

/** Admin category → calendar type. Anything that isn't a macro print or an
 *  unlock is an editorial event, shown under the "Protocol & other" filter. */
export function adminCategoryToType(cat: string | undefined): CalendarEvent['type'] {
  const c = (cat ?? '').trim().toLowerCase();
  if (c === 'macro') return 'macro';
  if (c === 'token unlock' || c === 'unlock') return 'unlock';
  return 'protocol';
}

/**
 * Admin date + optional time → ISO timestamp. Times are UTC ("HH:MM" from the
 * picker; legacy free text like "8:30 AM UTC" is parsed too). No/unparseable
 * time → all-day event, pinned to 12:00 UTC so it lands on the same calendar
 * day for viewers from UTC-11 to UTC+11.
 */
export function parseAdminWhen(date: string, time?: string): { ts: string; allDay: boolean } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const m = /^\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(time ?? '');
  if (!m) return { ts: `${date}T12:00:00.000Z`, allDay: true };
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3]?.toLowerCase();
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return { ts: `${date}T12:00:00.000Z`, allDay: true };
  const pad = (n: number) => String(n).padStart(2, '0');
  return { ts: `${date}T${pad(h)}:${pad(min)}:00.000Z`, allDay: false };
}

/** "btc, eth ,SOL" → ['BTC','ETH','SOL']. Empty macro events default to the
 *  same market-wide BTC proxy the feed's macro prints use. */
export function parseAdminAssets(raw: string | undefined, type: CalendarEvent['type']): string[] {
  const list = (raw ?? '')
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z0-9]{2,10}$/.test(s));
  const unique = [...new Set(list)];
  if (unique.length === 0 && type === 'macro') return ['BTC'];
  return unique;
}

const IMPACT: Record<string, CalendarEvent['impact']> = { high: 'HIGH', med: 'MED', medium: 'MED', low: 'LOW' };

/** Returns null for docs without a title or a valid date (never rendered half-broken). */
export function adminToEvent(id: string, doc: AdminCalendarDoc): CalendarEvent | null {
  const title = (doc.t ?? '').trim();
  if (!title || !doc.date) return null;
  const when = parseAdminWhen(doc.date, doc.time);
  if (!when) return null;
  const type = adminCategoryToType(doc.cat);
  return {
    id: `kumami-${id}`,
    type,
    title,
    ts: when.ts,
    allDay: when.allDay,
    impact: IMPACT[(doc.imp ?? '').toLowerCase()] ?? 'MED',
    assets: parseAdminAssets(doc.assets, type),
    description: (doc.d ?? '').trim(),
    source: 'kumami',
    category: doc.cat?.trim() || undefined,
  };
}

/** The fixed Plus roster the popups are scoped to (Kumami Plus §7.3). */
export const PLUS_ROSTER = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'] as const;

/**
 * Can this event trigger the "high-impact event soon" popups (Calendar D-1
 * popup + Console "Needs your attention today")? Spec §7.3: HIGH impact AND
 * involving BTC/ETH/SOL/BNB/HYPE. Team-added (Kumami) HIGH events always
 * qualify — an admin marking an event HIGH is an explicit "tell everyone".
 */
export function isAttentionEligible(e: CalendarEvent): boolean {
  if (e.impact !== 'HIGH') return false;
  if (e.source === 'kumami') return true;
  return e.assets.some((a) => (PLUS_ROSTER as readonly string[]).includes(a));
}

/** Chronological merge of every source. */
export function mergeCalendarEvents(...lists: CalendarEvent[][]): CalendarEvent[] {
  return lists.flat().sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
}
