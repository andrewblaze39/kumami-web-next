'use client';

/**
 * Console mini calendar (v1.18, Andrew 29 Oct 2026: "show a mini version instead of next 7 days").
 * A compact month grid of Calendar Plus: today highlighted, one coloured dot per event kind on
 * each day (same colours as the Calendar page), the next 3 upcoming events below, and a link
 * to the full Calendar. Reads /api/market/calendar (Calendar Plus) like the Calendar page.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CalendarPayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from './useMarketEndpoint';
import { WIcon } from './console-ui';
import { KIND_COLOR, KIND_LABEL, addMonths, kindOf, monthGrid, startOfMonth } from '@/components/world/calendar/calendarUi';
import type { CalendarKind } from '@/lib/market/rules/calendarEvents';

const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function CalendarPreview() {
  const { status, data } = useMarketEndpoint<CalendarPayload>('/api/market/calendar');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [openedAt] = useState(() => Date.now());
  const events = useMemo(() => data?.events ?? [], [data]);
  const grid = useMemo(() => monthGrid(month, events), [month, events]);
  const inMonth = grid.filter((c) => c.inMonth).reduce((n, c) => n + c.events.length, 0);

  const upcoming = useMemo(
    () => events.filter((e) => Date.parse(e.ts) > openedAt).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)).slice(0, 3),
    [events, openedAt],
  );

  return (
    <section className="w-apanel" aria-label="Calendar" data-tour="calendar-preview">
      <div className="w-apanel-h">
        <span className="w-ttl">
          <span className="w-ic"><WIcon name="clock" /></span>{' '}Calendar{' '}
          <span className="w-oc-q" tabIndex={0} title="This month at a glance: a coloured dot for each kind of event on a day. Open the Calendar for details.">?</span>
        </span>
        <span className="w-sub">{status === 'loading' ? 'This month' : `${inMonth} event${inMonth === 1 ? '' : 's'} this month`}</span>
      </div>

      {status === 'loading' ? (
        <div className="w-apanel-b"><div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" /></div>
      ) : !data ? (
        <div className="w-apanel-b"><p className="w-panel-empty">Couldn&apos;t load the calendar right now.</p></div>
      ) : (
        <div className="w-mcal">
          <div className="w-mcal-head">
            <button type="button" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}>‹</button>
            <b>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>
            <button type="button" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>›</button>
          </div>
          <div className="w-mcal-grid" role="grid" aria-label="Month">
            {WD.map((d, i) => <span key={i} className="w-mcal-wd">{d}</span>)}
            {grid.map((c) => {
              const kinds = [...new Set(c.events.map(kindOf))] as CalendarKind[];
              return (
                <span
                  key={c.key}
                  className={`w-mcal-day${c.inMonth ? '' : ' out'}${c.isToday ? ' today' : ''}`}
                  title={c.events.length ? c.events.map((e) => `${e.title} (${KIND_LABEL[kindOf(e)]})`).join('\n') : undefined}
                  aria-label={`${c.date.getDate()}: ${c.events.length} event${c.events.length === 1 ? '' : 's'}`}
                >
                  <span className="w-mcal-num">{c.date.getDate()}</span>
                  <span className="w-mcal-dots">{kinds.slice(0, 3).map((k) => <i key={k} style={{ background: KIND_COLOR[k] }} />)}</span>
                </span>
              );
            })}
          </div>
          <div className="w-mcal-up" aria-label="Coming up">
            {upcoming.length === 0 ? (
              <span className="w-panel-empty">No upcoming events yet.</span>
            ) : upcoming.map((e) => (
              <div key={e.id} className="w-mcal-up-row">
                <i style={{ background: KIND_COLOR[kindOf(e)] }} aria-hidden />
                <span className="w-mcal-up-when">
                  {new Date(e.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(e.allDay ? { timeZone: 'UTC' } : {}) })}
                </span>
                <span className="w-mcal-up-title" title={e.title}>{e.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-apanel-foot">
        <span className="w-fmeta">This month</span>
        <Link href="/world/calendar">Open Calendar <WIcon name="arrowR" /></Link>
      </div>
    </section>
  );
}
