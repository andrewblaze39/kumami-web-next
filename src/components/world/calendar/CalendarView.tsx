'use client';

/**
 * CalendarView — the month calendar, shared by Calendar Plus (/world/calendar) and Calendar Pro
 * (Pro → Calendar Pro). Same UI; the only difference is the data (Andrew, 29 Oct 2026):
 *   - plus: /api/market/calendar        — team events for Plus and Pro, macro events (feed on)
 *   - pro:  /api/market/calendar?view=pro — the same plus "Pro only" team events, airdrop
 *           TGE / claim days and token unlocks
 *
 * Google-Calendar-style month grid (v1.18): colour-coded event chips with a kind label
 * (colour is never the only cue), today highlighted, click a day to see its events in full.
 * No category / asset / impact filters (removed in v1.18). A "next up" card shows the nearest
 * event; HIGH-impact team events in the next 24h raise the reminder popup once per browser.
 */

import { useEffect, useMemo, useState } from 'react';
import type { CalendarEvent, CalendarPayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { WIcon } from '@/components/world/panels/console-ui';
import { RichText } from '@/components/RichText';
import { isAttentionEligible, isProOnlyEvent } from '@/lib/market/rules/calendarEvents';
import { plainText } from '@/lib/richText';
import {
  KIND_COLOR, KIND_LABEL, LEGEND, addMonths, formatEventDate, formatEventTime, kindOf, monthGrid, startOfMonth,
} from './calendarUi';

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS_PER_CELL = 3;
const D1_DISMISSED_KEY = 'kumami_calendar_d1_dismissed';

const IMPACT_BADGE: Record<CalendarEvent['impact'], string> = {
  HIGH: 'w-flow-radar-sev-badge w-flow-radar-sev-high',
  MED: 'w-flow-radar-sev-badge w-flow-radar-sev-med',
  LOW: 'w-flow-radar-sev-badge w-flow-radar-sev-low',
};

function KindTag({ e, view }: { e: CalendarEvent; view: 'plus' | 'pro' }) {
  const k = kindOf(e);
  return (
    <span className="w-cal-kind" style={{ color: KIND_COLOR[k] }}>
      <i style={{ background: KIND_COLOR[k] }} aria-hidden /> {KIND_LABEL[k]}
      {view === 'pro' && isProOnlyEvent(e) && <b className="w-cal-protag">PRO</b>}
    </span>
  );
}

function EventDetail({ e, view }: { e: CalendarEvent; view: 'plus' | 'pro' }) {
  return (
    <div className="w-cal-detail-row" style={{ borderLeftColor: KIND_COLOR[kindOf(e)] }}>
      <div className="w-cal-detail-top">
        <span className="w-cal-detail-time">{formatEventTime(e)}</span>
        <b className="w-cal-detail-title">{e.title}</b>
        <span className={IMPACT_BADGE[e.impact]}>{e.impact}</span>
        <KindTag e={e} view={view} />
      </div>
      {e.description && <p><RichText text={e.description} /></p>}
      {e.assets.length > 0 && <div className="w-cal-detail-assets">Affects: {e.assets.join(', ')}</div>}
      {e.link && <a className="w-cal-link" href={e.link} target="_blank" rel="noopener noreferrer">Official link →</a>}
    </div>
  );
}

export function CalendarView({ view }: { view: 'plus' | 'pro' }) {
  const { status, data } = useMarketEndpoint<CalendarPayload>(view === 'pro' ? '/api/market/calendar?view=pro' : '/api/market/calendar');
  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState<string>(() => new Date().toDateString());
  const [popupEvent, setPopupEvent] = useState<CalendarEvent | null>(null);
  const [openedAt] = useState(() => Date.now());

  const events = useMemo(() => data?.events ?? [], [data]);

  // Reminder popup: first HIGH-impact team event in the next 24h, not yet dismissed in this browser.
  useEffect(() => {
    if (!data) return;
    const now = Date.now();
    let dismissed: string[] = [];
    try { dismissed = JSON.parse(localStorage.getItem(D1_DISMISSED_KEY) ?? '[]'); } catch { dismissed = []; }
    const upcoming = data.events.find((e) => {
      const dt = Date.parse(e.ts) - now;
      return isAttentionEligible(e) && dt > 0 && dt <= 24 * 3_600_000 && !dismissed.includes(e.id);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens the popup once the data arrives
    if (upcoming) setPopupEvent(upcoming);
  }, [data]);

  const dismissPopup = (event: CalendarEvent) => {
    try {
      const dismissed: string[] = JSON.parse(localStorage.getItem(D1_DISMISSED_KEY) ?? '[]');
      localStorage.setItem(D1_DISMISSED_KEY, JSON.stringify([...dismissed, event.id]));
    } catch { /* storage unavailable: the popup simply shows again next time */ }
    setPopupEvent(null);
  };

  const nextUp = useMemo(
    () => events.filter((e) => Date.parse(e.ts) > openedAt).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))[0] ?? null,
    [events, openedAt],
  );

  const grid = useMemo(() => monthGrid(monthCursor, events), [monthCursor, events]);
  const selected = grid.find((c) => c.key === selectedKey) ?? null;
  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const feedsOff = data?.feeds ? !data.feeds.macroFeed && !data.feeds.unlockFeed : false;

  return (
    <div className="w-content-inner" data-calendar-view={view}>
      <div className="w-oc-head">
        <div className="w-oc-head-top">
          <div>
            <h1><WIcon name="clock" /> {view === 'pro' ? 'Calendar Pro' : 'Calendar'}</h1>
            <p className="w-oc-sub">
              {view === 'pro'
                ? `Everything in the Calendar, plus Pro-only events and airdrop claim days${feedsOff ? '' : ' and token unlocks'}.`
                : feedsOff ? 'Key dates and events picked by the Kumami team.' : 'Key dates, macro releases and events picked by the Kumami team.'}
            </p>
          </div>
        </div>
      </div>

      {nextUp && (
        <div className="w-cal-nextup" style={{ borderLeftColor: KIND_COLOR[kindOf(nextUp)] }}>
          <div className="w-cal-nextup-main">
            <div className="w-cal-nextup-title">
              {nextUp.title} <span className={IMPACT_BADGE[nextUp.impact]}>{nextUp.impact}</span>
            </div>
            {nextUp.description && <p><RichText text={nextUp.description} /></p>}
            {nextUp.link && <a className="w-cal-link" href={nextUp.link} target="_blank" rel="noopener noreferrer">Official link →</a>}
            <span className="w-cal-nextup-when">{formatEventDate(nextUp)}</span>
          </div>
          <span className="w-cal-nextup-type"><KindTag e={nextUp} view={view} /></span>
        </div>
      )}

      <div className="w-cal-legend" aria-label="Colour key">
        {LEGEND[view].filter((k) => k === 'team' || events.some((e) => kindOf(e) === k)).map((k) => (
          <span key={k}><i style={{ background: KIND_COLOR[k] }} aria-hidden /> {KIND_LABEL[k]}</span>
        ))}
      </div>

      {status === 'loading' ? (
        <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" style={{ minHeight: 400 }} />
      ) : !data ? (
        <section className="w-apanel"><div className="w-apanel-b"><p className="w-panel-empty">Couldn&apos;t load the calendar right now.</p></div></section>
      ) : (
        <div className="w-cal-layout">
          <section className="w-apanel w-cal-month" aria-label="Calendar">
            <div className="w-cal-month-nav">
              <button type="button" aria-label="Previous month" onClick={() => setMonthCursor((m) => addMonths(m, -1))}>‹</button>
              <span className="w-cal-month-label">{monthLabel}</span>
              <button type="button" aria-label="Next month" onClick={() => setMonthCursor((m) => addMonths(m, 1))}>›</button>
              <button type="button" className="w-cal-today-btn" onClick={() => { setMonthCursor(startOfMonth(new Date())); setSelectedKey(new Date().toDateString()); }}>Today</button>
            </div>
            <div className="w-cal-grid-headers">{WEEKDAY_HEADERS.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="w-cal-grid-body">
              {grid.map((cell) => (
                <button
                  type="button"
                  key={cell.key}
                  className={`w-cal-cell${cell.inMonth ? '' : ' w-cal-cell-outside'}${cell.key === selectedKey ? ' w-cal-cell-selected' : ''}`}
                  onClick={() => setSelectedKey(cell.key)}
                  aria-label={`${cell.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}: ${cell.events.length} event${cell.events.length === 1 ? '' : 's'}`}
                >
                  <span className={`w-cal-cell-num${cell.isToday ? ' w-cal-cell-today' : ''}`}>{cell.date.getDate()}</span>
                  <span className="w-cal-cell-events">
                    {cell.events.slice(0, MAX_CHIPS_PER_CELL).map((e) => (
                      <span
                        key={e.id}
                        className="w-cal-cell-event"
                        data-kind={kindOf(e)}
                        style={{ ['--k' as string]: KIND_COLOR[kindOf(e)] }}
                        title={`${e.title} · ${KIND_LABEL[kindOf(e)]} · ${e.impact}${e.description ? ` — ${plainText(e.description)}` : ''}`}
                      >
                        <b>{e.impact === 'HIGH' ? '! ' : ''}{e.title}</b>
                        <span>{formatEventTime(e)}</span>
                      </span>
                    ))}
                    {cell.events.length > MAX_CHIPS_PER_CELL && (
                      <span className="w-cal-cell-more">+{cell.events.length - MAX_CHIPS_PER_CELL} more</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <aside className="w-apanel w-cal-day" aria-label="Selected day">
            <div className="w-apanel-h">
              <span className="w-ttl">
                {selected ? selected.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Pick a day'}
              </span>
              {selected && <span className="w-sub">{selected.events.length} event{selected.events.length === 1 ? '' : 's'}</span>}
            </div>
            <div className="w-apanel-b">
              {!selected ? (
                <p className="w-panel-empty">Pick a day in this month to see its events.</p>
              ) : selected.events.length === 0 ? (
                <p className="w-panel-empty">No events on this day.</p>
              ) : (
                selected.events.map((e) => <EventDetail key={e.id} e={e} view={view} />)
              )}
            </div>
          </aside>
        </div>
      )}

      {data && events.length === 0 && (
        <p className="w-panel-empty" style={{ marginTop: 12 }}>No events scheduled yet. The Kumami team adds them as dates are confirmed.</p>
      )}

      {popupEvent && (
        <div className="w-cal-d1-overlay" role="dialog" aria-modal="true" aria-label="High-impact event tomorrow">
          <div className="w-cal-d1-modal">
            <div className="w-cal-d1-head">📅 High-impact event soon</div>
            <div className="w-cal-d1-title">{popupEvent.title}</div>
            <div className="w-cal-d1-when">{formatEventDate(popupEvent)}</div>
            {popupEvent.description && <p><RichText text={popupEvent.description} /></p>}
            {popupEvent.link && <a className="w-cal-link" href={popupEvent.link} target="_blank" rel="noopener noreferrer">Official link →</a>}
            <div className="w-cal-d1-assets">Affected: {popupEvent.assets.length ? popupEvent.assets.join(', ') : 'market-wide'}</div>
            <div className="w-cal-d1-actions">
              <button className="w-btn w-btn-ghost w-btn-sm" onClick={() => dismissPopup(popupEvent)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
