/**
 * Shared calendar presentation (v1.18): colour per event kind, with a text label so colour is
 * never the only cue. Used by the Calendar page (Plus and Pro) and the Console mini calendar.
 */
import type { CalendarEvent } from '@/lib/market/contracts';
import { calendarKind, type CalendarKind } from '@/lib/market/rules/calendarEvents';

export const KIND_COLOR: Record<CalendarKind, string> = {
  team: '#00c2c7',    // Kumami turquoise — events the team adds
  macro: '#5b9bff',   // blue — economic releases
  unlock: '#f5a524',  // amber — token unlocks (Calendar Pro)
  airdrop: '#b388ff', // purple — airdrop TGE / claim days (Calendar Pro)
};

export const KIND_LABEL: Record<CalendarKind, string> = {
  team: 'Kumami',
  macro: 'Macro',
  unlock: 'Token unlock',
  airdrop: 'Airdrop',
};

/** Kinds shown in each calendar's legend. */
export const LEGEND: Record<'plus' | 'pro', CalendarKind[]> = {
  plus: ['team', 'macro'],
  pro: ['team', 'macro', 'unlock', 'airdrop'],
};

export const kindOf = (e: CalendarEvent): CalendarKind => calendarKind(e);

const DAY_MS = 24 * 3_600_000;
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** All-day events are stored at 00:00 UTC on their date; read that date, not the local one. */
export function dayKey(e: CalendarEvent): string {
  if (e.allDay) {
    const d = new Date(e.ts);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toDateString();
  }
  return startOfDay(new Date(e.ts)).toDateString();
}

const IMPACT_RANK: Record<CalendarEvent['impact'], number> = { HIGH: 0, MED: 1, LOW: 2 };
/** Within a day: team events first, then by impact, then by time. */
export function cellOrder(a: CalendarEvent, b: CalendarEvent): number {
  const k = Number(b.source === 'kumami') - Number(a.source === 'kumami');
  if (k !== 0) return k;
  const i = IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact];
  return i !== 0 ? i : Date.parse(a.ts) - Date.parse(b.ts);
}

export type MonthCell = { key: string; date: Date; inMonth: boolean; isToday: boolean; events: CalendarEvent[] };

/** Monday-start month grid; every cell renders, including leading / trailing days of the next and previous months. */
export function monthGrid(month: Date, events: CalendarEvent[]): MonthCell[] {
  const firstWeekday = (month.getDay() + 6) % 7;
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstWeekday);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const today = startOfDay(new Date()).toDateString();
  const byKey = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const k = dayKey(e);
    byKey.set(k, [...(byKey.get(k) ?? []), e]);
  }
  return Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const key = d.toDateString();
    return {
      key, date: d, inMonth: d.getMonth() === month.getMonth(), isToday: key === today,
      events: [...(byKey.get(key) ?? [])].sort(cellOrder),
    };
  });
}

export function formatEventTime(e: CalendarEvent): string {
  if (e.allDay) return 'All day';
  return new Date(e.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
export function formatEventDate(e: CalendarEvent): string {
  if (e.allDay) {
    return `${new Date(e.ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })} · All day`;
  }
  return new Date(e.ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export { DAY_MS };
