import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { digestCalendarRows, digestUsd, topSmartMoneyOpens } from '../digestLines';
import type { CalendarEvent, FlowEvent } from '../../contracts';

const now = Date.parse('2026-10-20T08:00:00Z');
const ev = (id: string, over: Partial<FlowEvent>): FlowEvent => ({
  id, type: 'smart_money', asset: 'BTC', amountUsd: 1e6, direction: 'Smart Money', severity: 'MED',
  description: '', ts: '2026-10-20T07:00:00Z', action: 'open', ...over,
});

describe('topSmartMoneyOpens (v1.15 Pro §1)', () => {
  it('keeps opens from the last 24h, largest first, max 3', () => {
    const out = topSmartMoneyOpens([
      ev('a', { amountUsd: 5e6 }),
      ev('b', { amountUsd: 9e6 }),
      ev('c', { amountUsd: 7e6 }),
      ev('d', { amountUsd: 2e6 }),
      ev('closed', { amountUsd: 50e6, action: 'close' }),
      ev('old', { amountUsd: 40e6, ts: '2026-10-19T07:59:00Z' }),
      ev('whale', { amountUsd: 60e6, type: 'whale_transfer' }),
    ], now);
    expect(out.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });
  it('returns nothing when no opens are known', () => {
    expect(topSmartMoneyOpens([ev('x', { action: undefined })], now)).toEqual([]);
  });
});

describe('digestUsd', () => {
  it('formats compact amounts', () => {
    expect(digestUsd(9_928_320)).toBe('$9.9M');
    expect(digestUsd(1.24e9)).toBe('$1.2B');
    expect(digestUsd(640_000)).toBe('$640K');
  });
});

describe('digestCalendarRows (Digest calendar section, fed by /api/market/calendar)', () => {
  // Local mid-day so "today" is the same calendar day in every test time zone.
  const today = new Date(2026, 9, 29, 12).getTime();
  const cal = (id: string, ts: string, over: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id, type: 'protocol', title: id, ts, impact: 'MED', assets: [], description: '', source: 'kumami', ...over,
  });

  it('shows upcoming team events only, soonest date first, max 3', () => {
    const rows = digestCalendarRows([
      cal('kumami-late', '2026-11-20T12:00:00.000Z'),
      cal('kumami-past', '2026-10-20T12:00:00.000Z'),
      cal('kumami-soon', '2026-11-02T09:30:00.000Z'),
      cal('kumami-mid', '2026-11-10T12:00:00.000Z'),
      cal('kumami-later', '2026-12-01T12:00:00.000Z'),
      cal('macro-1', '2026-11-01T12:30:00.000Z', { type: 'macro', source: 'feed' }),
      cal('unlock-1', '2026-11-01T00:00:00.000Z', { type: 'unlock', source: 'feed' }),
      cal('airdrop-x', '2026-11-01T12:00:00.000Z'), // own Airdrops section, never in Calendar
    ], today);
    expect(rows.map((r) => r.id)).toEqual(['kumami-soon', 'kumami-mid', 'kumami-late']);
  });

  it('labels with the title and the authored date (timed events too)', () => {
    expect(digestCalendarRows([cal('kumami-a', '2026-11-02T21:30:00.000Z', { title: 'FOMC' })], today))
      .toEqual([{ id: 'kumami-a', label: 'FOMC', meta: '2026-11-02' }]);
  });

  it('keeps whatever audience mix the server returned (legacy, Plus-only, Pro-only) untouched', () => {
    const rows = digestCalendarRows([
      cal('kumami-legacy', '2026-11-03T12:00:00.000Z'),
      cal('kumami-pro', '2026-11-04T12:00:00.000Z', { audience: { plus: false, pro: true } }),
      cal('kumami-plus', '2026-11-05T12:00:00.000Z', { audience: { plus: true, pro: false } }),
    ], today);
    expect(rows.map((r) => r.id)).toEqual(['kumami-legacy', 'kumami-pro', 'kumami-plus']);
  });

  it('is empty when nothing is upcoming', () => {
    expect(digestCalendarRows([], today)).toEqual([]);
    expect(digestCalendarRows([cal('kumami-past', '2026-10-01T12:00:00.000Z')], today)).toEqual([]);
  });
});

describe('DailyDigest calendar source', () => {
  it('reads the tier-filtered /api/market/calendar route, never pro_calendar directly', () => {
    const src = readFileSync(path.resolve(__dirname, '../../../../components/world/pro/tabs/DailyDigest.tsx'), 'utf8');
    expect(src).not.toMatch(/['"`]pro_calendar['"`]/); // no Firestore read of the collection
    expect(src).toContain("useMarketEndpoint<CalendarPayload>('/api/market/calendar')");
  });
});
