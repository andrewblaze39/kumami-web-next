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
  cat?: string;          // Macro | Token unlock | Listing | Token sale / TGE | On-chain | Regulatory | Project | Other
  d?: string;            // description
  venue?: string;        // Token sale / TGE: where it happens (launchpad / exchange)
  raise?: string;        // Token sale / TGE: raise or FDV, free text ("$12M raise", "$400M FDV")
  link?: string;         // Token sale / TGE: official link
  assets?: string;       // comma-separated tickers, optional
  status?: string;       // only 'published' docs are ever passed in
  audience?: { plus?: boolean; pro?: boolean };
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

/** Rachelle v1.15 Plus §5 admin categories. */
export const ADMIN_CATEGORIES = ['Macro', 'Token unlock', 'Listing', 'Token sale / TGE', 'On-chain', 'Regulatory', 'Project', 'Other'];
export const TOKEN_SALE = 'Token sale / TGE';

/**
 * A token sale needs project, ticker, date and time (UTC), venue, raise or FDV, and a
 * link (v1.15 Plus §5). Returns the missing field names (empty = complete).
 */
export function missingTokenSaleFields(doc: AdminCalendarDoc): string[] {
  if (doc.cat !== TOKEN_SALE) return [];
  const miss: string[] = [];
  if (!doc.t?.trim()) miss.push('project');
  if (!doc.assets?.trim()) miss.push('ticker');
  if (!doc.date) miss.push('date');
  if (!/^\d{2}:\d{2}$/.test(doc.time ?? '')) miss.push('time (UTC)');
  if (!doc.venue?.trim()) miss.push('venue');
  if (!doc.raise?.trim()) miss.push('raise or FDV');
  if (!/^https?:\/\/\S+$/i.test(doc.link?.trim() ?? '')) miss.push('link');
  return miss;
}

/**
 * Admin audience switches (Plus / Pro, independent). A doc with no boolean flag is a
 * legacy doc: no audience, so it shows to both. A missing flag inside a partial one counts as on.
 */
export function parseAdminAudience(a: AdminCalendarDoc['audience']): CalendarEvent['audience'] {
  if (!a || (typeof a.plus !== 'boolean' && typeof a.pro !== 'boolean')) return undefined;
  return { plus: a.plus !== false, pro: a.pro !== false };
}

/** New admin events are shown to both tiers until the admin switches one off. */
export const DEFAULT_AUDIENCE = { plus: true, pro: true } as const;

/** The admin form's switches for an existing doc: legacy docs (no audience) load as both on. */
export function audienceFormState(a: AdminCalendarDoc['audience']): { plus: boolean; pro: boolean } {
  return parseAdminAudience(a) ?? { ...DEFAULT_AUDIENCE };
}

/** At least one tier must see the event; null when the switches are valid. */
export function audienceError(a: { plus: boolean; pro: boolean }): string | null {
  return a.plus || a.pro ? null : 'Choose who sees this event: Plus or Pro (or both).';
}

/** The admin calendar form (PublishCalendar). `cat` is only set when editing a legacy doc that has one. */
export type AdminCalendarForm = {
  t: string; date: string; time: string; imp: string; d: string; assets: string;
  venue: string; raise: string; link: string; cat?: string;
  audience: { plus: boolean; pro: boolean };
};

/**
 * The fields PublishCalendar writes to pro_calendar. The category control is gone (calendar PRD,
 * 28 Oct 2026), so new docs carry no `cat`; a legacy doc's `cat` is kept on edit so it renders as before.
 */
export function adminCalendarFields(form: AdminCalendarForm): Omit<AdminCalendarDoc, 'status'> & { audience: { plus: boolean; pro: boolean } } {
  const { cat, audience, ...rest } = form;
  return { ...rest, ...(cat?.trim() ? { cat } : {}), audience: { plus: audience.plus, pro: audience.pro } };
}

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
    description: [
      (doc.d ?? '').trim(),
      doc.venue?.trim() ? `Venue: ${doc.venue.trim()}` : '',
      doc.raise?.trim() ? `Raise / FDV: ${doc.raise.trim()}` : '',
    ].filter(Boolean).join(' · '),
    source: 'kumami',
    audience: parseAdminAudience(doc.audience),
    category: doc.cat?.trim() || undefined,
    ...(/^https?:\/\//i.test(doc.link?.trim() ?? '') ? { link: doc.link!.trim() } : {}),
  };
}

/** Published Airdrops & Whitelist doc (components/admin/PublishAirdrops). */
export type AirdropDoc = { name?: string; cat?: string; desc?: string; tgeDate?: string; tgeTime?: string };

/**
 * An Airdrops & Whitelist entry with a TGE / claim date appears on the Calendar
 * automatically (v1.15 Plus §5) — as a team event, MED impact.
 */
export function airdropToEvent(id: string, doc: AirdropDoc): CalendarEvent | null {
  const name = (doc.name ?? '').trim();
  if (!name || !doc.tgeDate) return null;
  const when = parseAdminWhen(doc.tgeDate, doc.tgeTime);
  if (!when) return null;
  const kind = doc.cat === 'whitelist' ? 'Whitelist' : 'Airdrop';
  return {
    id: `airdrop-${id}`,
    type: 'protocol',
    title: `${name} — ${kind} TGE / claim`,
    ts: when.ts,
    allDay: when.allDay,
    impact: 'MED',
    assets: [],
    description: (doc.desc ?? '').trim().slice(0, 200),
    source: 'kumami',
    category: 'Airdrop TGE / claim',
  };
}

/** Airdrop entries are Pro content: the Calendar route hides them from Plus. */
export function isAirdropEvent(e: Pick<CalendarEvent, 'id'>): boolean {
  return e.id.startsWith('airdrop-');
}

/** Market tier as resolved by gating.ts: 'free' is every signed-in non-Pro account (Kumami Plus). */
type CalendarTier = 'free' | 'pro';

/** Legacy events have no audience flag and remain visible to both tiers. */
export function isCalendarEventVisibleToTier(event: Pick<CalendarEvent, 'id' | 'audience'>, tier: CalendarTier): boolean {
  return event.audience?.[tier === 'pro' ? 'pro' : 'plus'] !== false;
}

/** The events one tier may see: the admin audience flags, and airdrops stay Pro-only whatever their flags say. */
export function calendarEventsForTier<E extends Pick<CalendarEvent, 'id' | 'audience'>>(events: E[], tier: CalendarTier): E[] {
  return events.filter((e) => isCalendarEventVisibleToTier(e, tier) && (tier === 'pro' || !isAirdropEvent(e)));
}

/** The fixed Plus roster (Kumami Plus §7.3). */
export const PLUS_ROSTER = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'] as const;

/**
 * Can this event trigger the "high-impact event soon" popups (Calendar D-1
 * popup, Console "Needs your attention today") and the Console badge?
 * Rachelle v1.15 Plus §5: the Calendar is manual-first, so all three run on
 * team-added (Kumami) HIGH events only — an admin marking an event HIGH is an
 * explicit "tell everyone". Feed events never trigger them, even if an admin
 * switches a feed back on.
 */
export function isAttentionEligible(e: CalendarEvent): boolean {
  return e.impact === 'HIGH' && e.source === 'kumami';
}

/** Console badge window (Rachelle v1.15 Plus §1.5): HIGH events starting within 6h. */
export const CONSOLE_BADGE_WINDOW_MS = 6 * 3_600_000;

/** Upcoming badge-eligible events, soonest first (already-started events excluded). */
export function consoleBadgeEvents(events: CalendarEvent[], now: number): CalendarEvent[] {
  return events
    .filter((e) => {
      const dt = Date.parse(e.ts) - now;
      return isAttentionEligible(e) && !e.allDay && dt > 0 && dt <= CONSOLE_BADGE_WINDOW_MS;
    })
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
}

/** "in 4h" / "in 35m" — the badge's countdown, rounded to the nearest hour from 1h up. */
export function badgeCountdown(ts: string, now: number): string {
  const min = Math.max(1, Math.round((Date.parse(ts) - now) / 60_000));
  return min < 60 ? `in ${min}m` : `in ${Math.round(min / 60)}h`;
}

/**
 * Chronological merge of every source, de-duplicated by id. The macro feed can
 * list the same release twice (same name, country and timestamp) — found by
 * Playwright QA as a React duplicate-key error on /world/calendar.
 */
export function mergeCalendarEvents(...lists: CalendarEvent[][]): CalendarEvent[] {
  const seen = new Set<string>();
  const out: CalendarEvent[] = [];
  for (const e of lists.flat()) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
}
