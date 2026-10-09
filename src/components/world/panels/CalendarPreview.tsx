'use client';

/**
 * Console's Calendar preview panel — replaces the old Intelligence preview
 * slot per Rachelle's latest Console mockup. Renders a day-by-day agenda for
 * the next 7 calendar days (today included), matching the mockup's grouped
 * layout rather than a flat "next N events" list.
 */

import Link from 'next/link';
import type { CalendarEvent, CalendarPayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from './useMarketEndpoint';
import { WIcon } from './console-ui';

const CATEGORY_LABEL: Record<CalendarEvent['type'], string> = {
  macro: 'Macro',
  unlock: 'On-chain',
  protocol: 'Protocol',
};

const DAY_MS = 24 * 3_600_000;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

type DayBucket = { key: string; label: string; dateNum: number; events: CalendarEvent[] };

/** With the feed's forward window there can be ~30 macro prints a day — the
 *  agenda shows the most relevant few: team events, then HIGH → LOW, then time. */
const MAX_ROWS_PER_DAY = 3;
const IMPACT_RANK: Record<CalendarEvent['impact'], number> = { HIGH: 0, MED: 1, LOW: 2 };
function agendaOrder(a: CalendarEvent, b: CalendarEvent): number {
  const k = Number(b.source === 'kumami') - Number(a.source === 'kumami');
  if (k !== 0) return k;
  const i = IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact];
  return i !== 0 ? i : Date.parse(a.ts) - Date.parse(b.ts);
}

export default function CalendarPreview() {
  const { status, data } = useMarketEndpoint<CalendarPayload>('/api/market/calendar');
  const loading = status === 'loading';

  const today = startOfDay(new Date());
  const days: DayBucket[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() + i * DAY_MS);
    return {
      key: d.toDateString(),
      label: i === 0 ? 'Today' : WEEKDAY_SHORT[d.getDay()],
      dateNum: d.getDate(),
      events: [],
    };
  });
  const byKey = new Map(days.map((d) => [d.key, d]));

  const windowEnd = today.getTime() + 7 * DAY_MS;
  let totalEvents = 0;
  let highImpact = 0;
  for (const event of data?.events ?? []) {
    const ts = Date.parse(event.ts);
    if (ts < today.getTime() || ts >= windowEnd) continue;
    const bucket = byKey.get(startOfDay(new Date(ts)).toDateString());
    if (!bucket) continue;
    bucket.events.push(event);
    totalEvents += 1;
    if (event.impact === 'HIGH') highImpact += 1;
  }
  for (const d of days) d.events.sort(agendaOrder);

  return (
    <section className="w-apanel" aria-label="Calendar" data-tour="calendar-preview">
      <div className="w-apanel-h">
        <span className="w-ttl">
          <span className="w-ic"><WIcon name="doc" /></span>
          {' '}Calendar{' '}
          <span
            className="w-oc-q"
            tabIndex={0}
            title="Macro prints, token unlocks and Kumami team events landing this week, day by day (top 3 per day)."
          >
            ?
          </span>
        </span>
        <span className="w-sub">
          {loading ? 'This week' : `This week · ${totalEvents} event${totalEvents === 1 ? '' : 's'}${highImpact > 0 ? ` · ${highImpact} high impact` : ''}`}
        </span>
      </div>

      {loading ? (
        <div className="w-apanel-b">
          <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
        </div>
      ) : !data ? (
        <div className="w-apanel-b">
          <p className="w-panel-empty">Couldn&apos;t load the calendar right now.</p>
        </div>
      ) : (
        <div className="w-cal-agenda" aria-label="This week's calendar">
          {days.map((day) => (
            <div key={day.key} className="w-cal-agenda-day">
              <div className="w-cal-agenda-daylbl">
                <span>{day.label}</span>
                <span className="w-cal-agenda-daynum">{day.dateNum}</span>
              </div>
              {day.events.length === 0 ? (
                <div className="w-cal-agenda-empty">No scheduled events</div>
              ) : (
                <div className="w-cal-agenda-rows">
                  {day.events.slice(0, MAX_ROWS_PER_DAY).map((event) => (
                    <div key={event.id} className="w-cal-agenda-row">
                      <span className="w-cal-agenda-time">
                        {event.allDay ? 'All day' : formatTime(event.ts)}
                      </span>
                      <span className="w-cal-agenda-title">{event.source === 'kumami' ? '★ ' : ''}{event.title}</span>
                      <span className="w-cal-agenda-cat">{CATEGORY_LABEL[event.type]}</span>
                    </div>
                  ))}
                  {day.events.length > MAX_ROWS_PER_DAY && (
                    <div className="w-cal-agenda-empty">+{day.events.length - MAX_ROWS_PER_DAY} more</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="w-apanel-foot">
        <span className="w-fmeta">Next 7 days</span>
        <Link href="/world/calendar">
          Open Calendar <WIcon name="arrowR" />
        </Link>
      </div>
    </section>
  );
}
