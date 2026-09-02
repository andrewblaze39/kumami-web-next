'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProShellHead } from './shared';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const IMP_LABEL: Record<string, string> = { high: 'High impact', med: 'Medium', low: 'Low' };
const CHIP_BG: Record<string, string> = {
  high: 'rgba(255,107,129,.14)',
  med: 'rgba(240,182,94,.14)',
  low: 'var(--adv-surface-3)',
};

interface CalEvent {
  id: string;
  t: string;
  date: string; // YYYY-MM-DD
  time: string;
  imp: 'high' | 'med' | 'low';
  cat: string;
  d: string;
}

function parseLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Calendar — an economic & on-chain events calendar authored from
 * /admin/pro-calendar (`pro_calendar`, published only). Renders real dates on a
 * month grid, with a selected-event detail and an upcoming list.
 */
export function Calendar() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'pro_calendar'), where('status', '==', 'published'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CalEvent));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const { cells, monthLabel, sorted, todayKey } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dated = events
      .map((e) => ({ ...e, dateObj: parseLocalDate(e.date) }))
      .filter((e): e is CalEvent & { dateObj: Date } => e.dateObj !== null);

    const byDate: Record<string, (CalEvent & { dateObj: Date })[]> = {};
    dated.forEach((e) => {
      const k = dateKey(e.dateObj);
      (byDate[k] = byDate[k] || []).push(e);
    });

    const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const label = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDow = (viewDate.getDay() + 6) % 7;
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const prevDays = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();

    const cellList: { n: number; fade: boolean; date?: Date }[] = [];
    for (let i = 0; i < firstDow; i++) cellList.push({ n: prevDays - firstDow + 1 + i, fade: true });
    for (let d = 1; d <= daysInMonth; d++) cellList.push({ n: d, fade: false, date: new Date(viewDate.getFullYear(), viewDate.getMonth(), d) });
    while (cellList.length % 7 !== 0 || cellList.length < 35) cellList.push({ n: cellList.length - firstDow - daysInMonth + 1, fade: true });

    return {
      cells: cellList.map((c) => ({ ...c, events: c.date ? byDate[dateKey(c.date)] || [] : [] })),
      monthLabel: label,
      sorted: dated
        .filter((e) => e.dateObj.getTime() >= today.getTime())
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()),
      todayKey: dateKey(today),
    };
  }, [events, monthOffset]);

  const selected = selId ? events.find((e) => e.id === selId) : sorted[0];
  const selectedDate = selected ? parseLocalDate(selected.date) : null;

  return (
    <>
      <ProShellHead eyebrow="News & Signals" icon={<Clock size={24} />} title="Economic & Events Calendar">
        Macro prints, token unlocks and network upgrades on one calendar — so nothing on the schedule
        catches you off guard.
      </ProShellHead>

      {loading ? (
        <div className="oc-empty">Loading…</div>
      ) : events.length === 0 ? (
        <div className="oc-empty">No events scheduled yet — check back soon.</div>
      ) : (
        <>
          <div className="cal-day">
            <div className="cal-monthbar">
              <button className="btn btn-surface btn-sm" onClick={() => setMonthOffset((m) => m - 1)} aria-label="Previous month"><ChevronLeft size={15} /></button>
              <div className="cal-monthlabel">{monthLabel}</div>
              <button className="btn btn-surface btn-sm" onClick={() => setMonthOffset((m) => m + 1)} aria-label="Next month"><ChevronRight size={15} /></button>
            </div>

            <div className="cal-weekhead">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>

            <div className="cal-monthgrid">
              {cells.map((c, i) => {
                const isToday = c.date && dateKey(c.date) === todayKey;
                return (
                  <div className={`cal-cell${c.fade ? ' fade' : ''}`} key={i}>
                    <span className={`cal-daynum${isToday ? ' today' : ''}`}>{c.n}</span>
                    <div className="cal-cell-body">
                      {c.events.slice(0, 2).map((e) => (
                        <div className="cal-chip" key={e.id} style={{ background: CHIP_BG[e.imp] }} onClick={() => setSelId(e.id)}>
                          <b>{e.t}</b>
                          {e.time && <span>{e.time}</span>}
                        </div>
                      ))}
                      {c.events.length > 2 && <div className="cal-more">+{c.events.length - 2} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selected && selectedDate && (
            <>
              <div className="cal-day-h">Selected event</div>
              <div className="ad-detail">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span className={`cal-imp ${selected.imp}`} />
                  <span className="oc-tag neutral">{IMP_LABEL[selected.imp]}</span>
                  <span className="cal-tag">{selected.cat}</span>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: 17 }}>{selected.t}</h3>
                <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginBottom: 10 }}>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  {selected.time ? ` · ${selected.time}` : ''}
                </div>
                {selected.d && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{selected.d}</p>}
              </div>
            </>
          )}

          <div className="cal-day-h">Upcoming</div>
          {sorted.length === 0 ? (
            <div className="oc-empty">Nothing upcoming — past events only.</div>
          ) : (
            sorted.map((e) => (
              <div className="cal-row" key={e.id} style={{ cursor: 'pointer' }} onClick={() => setSelId(e.id)}>
                <span className="cal-time">{e.time || '—'}</span>
                <span className={`cal-imp ${e.imp}`} />
                <div className="cal-main">
                  <b>{e.t}</b>
                  <span>{e.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{e.d ? ` · ${e.d}` : ''}</span>
                </div>
                <span className="cal-tag">{e.cat}</span>
              </div>
            ))
          )}
        </>
      )}
    </>
  );
}
