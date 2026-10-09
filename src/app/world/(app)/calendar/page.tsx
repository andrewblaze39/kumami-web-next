'use client';

/**
 * /world/calendar — the ONE Calendar, shared by Plus and Pro (Pro's sidebar
 * shows it via the included Plus group; old /world/pro?tab=calendar links
 * redirect here).
 *
 * Data (see lib/market/live/calendarPage.ts): macro prints + token unlocks
 * from the market-data feed, merged with events the Kumami team adds by hand
 * at /admin/pro-calendar (published only — edits/deletes show on next load).
 * Team events are labelled "Kumami" and float to the top of each day cell so
 * they're never buried under dozens of low-impact macro prints.
 *
 * A real month-grid calendar (not just a list): month navigation, a "next
 * up" hero card for the nearest event, and every day cell always rendered
 * (empty days just show no chips) so the page never looks broken just
 * because no admin content has been added yet for a given day.
 *
 * Scoping notes (disclosed, not silently cut):
 *   - "Protocol & other" = admin-authored events whose category isn't Macro or
 *     Token unlock (On-chain, Regulatory, Project, Other). The feed itself has
 *     no protocol events, so this filter only ever shows team-added items.
 *   - The D-1 popup here fires on this page specifically (on mount, once per
 *     browser via localStorage), not truly "on next login" app-wide as the
 *     doc describes — a global version would need to live in the shell layout.
 */

import { useEffect, useMemo, useState } from 'react';
import type { CalendarEvent, CalendarPayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { WIcon } from '@/components/world/panels/console-ui';
import { isAttentionEligible } from '@/lib/market/rules/calendarEvents';

const TYPES: { key: CalendarEvent['type'] | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'macro', label: 'Macro' },
  { key: 'unlock', label: 'Token Unlocks' },
  { key: 'protocol', label: 'Protocol & other' },
];

const IMPACTS: CalendarEvent['impact'][] = ['HIGH', 'MED', 'LOW'];
const ASSETS = ['All', 'BTC', 'ETH', 'SOL', 'BNB', 'HYPE'] as const;
type AssetFilter = (typeof ASSETS)[number];

const DAY_MS = 24 * 3_600_000;
const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS_PER_CELL = 3;

const TYPE_COLOR: Record<CalendarEvent['type'], string> = {
  macro: '#5b9bff',
  unlock: '#46e3a0',
  protocol: '#8ea69c',
};
const TYPE_LABEL: Record<CalendarEvent['type'], string> = {
  macro: 'Macro',
  unlock: 'On-chain',
  protocol: 'Protocol',
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

const IMPACT_BADGE: Record<CalendarEvent['impact'], string> = {
  HIGH: 'w-flow-radar-sev-badge w-flow-radar-sev-high',
  MED: 'w-flow-radar-sev-badge w-flow-radar-sev-med',
  LOW: 'w-flow-radar-sev-badge w-flow-radar-sev-low',
};

function formatEventDate(e: CalendarEvent): string {
  if (e.allDay) {
    return `${new Date(e.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })} · All day`;
  }
  return new Date(e.ts).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
function formatEventTime(e: CalendarEvent): string {
  if (e.allDay) return 'All day';
  return new Date(e.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
/** "Macro", "Token unlock · Kumami", "Regulatory · Kumami", … */
function eventLabel(e: CalendarEvent): string {
  const base = e.category ?? TYPE_LABEL[e.type];
  return e.source === 'kumami' ? `${base} · Kumami` : base;
}
const IMPACT_RANK: Record<CalendarEvent['impact'], number> = { HIGH: 0, MED: 1, LOW: 2 };
/** Within a day: team events first, then by impact, then by time. */
function cellOrder(a: CalendarEvent, b: CalendarEvent): number {
  const k = Number(b.source === 'kumami') - Number(a.source === 'kumami');
  if (k !== 0) return k;
  const i = IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact];
  return i !== 0 ? i : Date.parse(a.ts) - Date.parse(b.ts);
}

const D1_DISMISSED_KEY = 'kumami_calendar_d1_dismissed';

export default function CalendarPage() {
  const { status, data } = useMarketEndpoint<CalendarPayload>('/api/market/calendar');
  const [type, setType] = useState<(typeof TYPES)[number]['key']>('all');
  const [impacts, setImpacts] = useState<Set<CalendarEvent['impact']>>(new Set(IMPACTS));
  const [asset, setAsset] = useState<AssetFilter>('All');
  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [popupEvent, setPopupEvent] = useState<CalendarEvent | null>(null);

  const events = data?.events ?? [];

  // D-1 popup: first HIGH-impact event in the next 24h, not yet dismissed this browser.
  useEffect(() => {
    if (!data) return;
    const now = Date.now();
    let dismissed: string[] = [];
    try {
      dismissed = JSON.parse(localStorage.getItem(D1_DISMISSED_KEY) ?? '[]');
    } catch {
      dismissed = [];
    }
    const upcoming = data.events.find((e) => {
      const dt = Date.parse(e.ts) - now;
      return isAttentionEligible(e) && dt > 0 && dt <= 24 * 3_600_000 && !dismissed.includes(e.id);
    });
    if (upcoming) setPopupEvent(upcoming);
  }, [data]);

  const dismissPopup = (event: CalendarEvent) => {
    try {
      const dismissed: string[] = JSON.parse(localStorage.getItem(D1_DISMISSED_KEY) ?? '[]');
      localStorage.setItem(D1_DISMISSED_KEY, JSON.stringify([...dismissed, event.id]));
    } catch {
      // ignore storage errors
    }
    setPopupEvent(null);
  };

  const toggleImpact = (imp: CalendarEvent['impact']) => {
    setImpacts((prev) => {
      const next = new Set(prev);
      if (next.has(imp)) next.delete(imp);
      else next.add(imp);
      return next;
    });
  };

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (type !== 'all' && e.type !== type) return false;
        if (!impacts.has(e.impact)) return false;
        if (asset !== 'All' && !e.assets.includes(asset)) return false;
        return true;
      }),
    [events, type, impacts, asset],
  );

  // Nearest upcoming event overall — the hero card ignores the filters below,
  // it's always "what's next", not "what's next that matches my filter".
  const nextUp = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => Date.parse(e.ts) > now)
      .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))[0] ?? null;
  }, [events]);

  // Full month grid — every day cell always renders (Monday-start), including
  // the leading/trailing days from adjacent months to fill the week rows.
  const monthGrid = useMemo(() => {
    const firstWeekday = (monthCursor.getDay() + 6) % 7; // Mon=0..Sun=6
    const gridStart = new Date(monthCursor.getTime() - firstWeekday * DAY_MS);
    const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const today = startOfDay(new Date()).getTime();

    const byDateKey = new Map<string, CalendarEvent[]>();
    for (const e of filtered) {
      const key = startOfDay(new Date(e.ts)).toDateString();
      const list = byDateKey.get(key) ?? [];
      list.push(e);
      byDateKey.set(key, list);
    }

    return Array.from({ length: totalCells }, (_, i) => {
      const d = new Date(gridStart.getTime() + i * DAY_MS);
      const dayEvents = (byDateKey.get(d.toDateString()) ?? []).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
      return {
        key: d.toDateString(),
        date: d,
        inMonth: d.getMonth() === monthCursor.getMonth(),
        isToday: d.getTime() === today,
        events: dayEvents,
      };
    });
  }, [filtered, monthCursor]);

  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="w-content-inner">
      <div className="w-oc-head">
        <div className="w-oc-head-top">
          <div>
            <h1>
              <WIcon name="clock" /> Economic &amp; Events Calendar
            </h1>
            <p className="w-oc-sub">
              Macro releases and on-chain events that matter to your positions.
            </p>
          </div>
        </div>
      </div>

      {nextUp && (
        <div className="w-cal-nextup" style={{ borderLeftColor: TYPE_COLOR[nextUp.type] }}>
          <div className="w-cal-nextup-main">
            <div className="w-cal-nextup-title">
              {nextUp.title} <span className={IMPACT_BADGE[nextUp.impact]}>{nextUp.impact}</span>
            </div>
            <p>{nextUp.description}</p>
            <span className="w-cal-nextup-when">{formatEventDate(nextUp)}</span>
          </div>
          <span className="w-cal-nextup-type" style={{ color: TYPE_COLOR[nextUp.type] }}>
            {eventLabel(nextUp)}
          </span>
        </div>
      )}

      <div className="w-flow-radar-filters">
        <div className="w-flow-radar-chip-row">
          {TYPES.map((t) => (
            <button
              key={t.key}
              className={`w-flow-radar-chip${type === t.key ? ' on' : ''}`}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="w-oc-asset-tabs">
          {ASSETS.map((a) => (
            <button key={a} className={a === asset ? 'on' : ''} onClick={() => setAsset(a)}>
              {a}
            </button>
          ))}
        </div>
        <div className="w-flow-radar-chip-row">
          {IMPACTS.map((imp) => (
            <button
              key={imp}
              className={`w-flow-radar-chip w-flow-radar-sev-${imp.toLowerCase()}${impacts.has(imp) ? ' on' : ''}`}
              onClick={() => toggleImpact(imp)}
            >
              {imp}
            </button>
          ))}
        </div>
      </div>

      {status === 'loading' ? (
        <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" style={{ minHeight: 400 }} />
      ) : (
        <section className="w-apanel w-cal-month" aria-label="Calendar">
          <div className="w-cal-month-nav">
            <button type="button" aria-label="Previous month" onClick={() => setMonthCursor((m) => addMonths(m, -1))}>‹</button>
            <span className="w-cal-month-label">{monthLabel}</span>
            <button type="button" aria-label="Next month" onClick={() => setMonthCursor((m) => addMonths(m, 1))}>›</button>
          </div>
          <div className="w-cal-grid-headers">
            {WEEKDAY_HEADERS.map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="w-cal-grid-body">
            {monthGrid.map((cell) => (
              <div key={cell.key} className={`w-cal-cell${cell.inMonth ? '' : ' w-cal-cell-outside'}`}>
                <span className={`w-cal-cell-num${cell.isToday ? ' w-cal-cell-today' : ''}`}>
                  {cell.date.getDate()}
                </span>
                <div className="w-cal-cell-events">
                  {[...cell.events].sort(cellOrder).slice(0, MAX_CHIPS_PER_CELL).map((e) => (
                    <div
                      key={e.id}
                      className="w-cal-cell-event"
                      style={{ borderLeftColor: TYPE_COLOR[e.type] }}
                      title={`${e.title} (${eventLabel(e)}, ${e.impact})${e.description ? ` — ${e.description}` : ''}`}
                    >
                      <b>{e.source === 'kumami' ? '★ ' : ''}{e.title}</b>
                      <span>{formatEventTime(e)}</span>
                    </div>
                  ))}
                  {cell.events.length > MAX_CHIPS_PER_CELL && (
                    <div className="w-cal-cell-more">+{cell.events.length - MAX_CHIPS_PER_CELL} more</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {popupEvent && (
        <div className="w-cal-d1-overlay" role="dialog" aria-modal="true" aria-label="High-impact event tomorrow">
          <div className="w-cal-d1-modal">
            <div className="w-cal-d1-head">📅 High-impact event soon</div>
            <div className="w-cal-d1-title">{popupEvent.title}</div>
            <div className="w-cal-d1-when">{formatEventDate(popupEvent)}</div>
            <p>{popupEvent.description}</p>
            <div className="w-cal-d1-assets">
              Affected: {popupEvent.assets.length ? popupEvent.assets.join(', ') : 'market-wide'}
            </div>
            <div className="w-cal-d1-actions">
              <button className="w-btn w-btn-ghost w-btn-sm" onClick={() => dismissPopup(popupEvent)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
