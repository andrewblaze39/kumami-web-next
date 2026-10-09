import { describe, it, expect } from 'vitest';
import {
  adminCategoryToType,
  adminToEvent,
  isAttentionEligible,
  macroToEvent,
  mergeCalendarEvents,
  parseAdminAssets,
  parseAdminWhen,
  unlockImpact,
  unlockToEvent,
} from '../calendarEvents';

describe('macroToEvent', () => {
  it('maps importance 3/2/1 to HIGH/MED/LOW and keeps the real publish time', () => {
    const base = {
      calendar_name: 'CPI YoY', country_code: 'US', data_effect: '', forecast_value: '3.1%',
      previous_value: '3.0%', publish_timestamp: Date.UTC(2026, 9, 15, 12, 30),
    };
    expect(macroToEvent({ ...base, importance_level: 3 }).impact).toBe('HIGH');
    expect(macroToEvent({ ...base, importance_level: 2 }).impact).toBe('MED');
    const low = macroToEvent({ ...base, importance_level: 1 });
    expect(low.impact).toBe('LOW');
    expect(low.ts).toBe('2026-10-15T12:30:00.000Z');
    expect(low.source).toBe('feed');
    expect(low.description).toContain('forecast 3.1%');
  });
});

describe('unlockToEvent', () => {
  const row = {
    symbol: 'ARB', name: 'Arbitrum', market_cap: 2_000_000_000,
    next_unlock_date: Date.UTC(2026, 9, 16), next_unlock_usd: 45_000_000, next_unlock_of_circulating: 1.8,
  };

  it('dates the event on the NEXT unlock, not "now"', () => {
    expect(unlockToEvent(row)?.ts).toBe('2026-10-16T00:00:00.000Z');
  });

  it('sizes impact by the next unlock as % of circulating supply', () => {
    expect(unlockToEvent(row)?.impact).toBe('MED');
    expect(unlockImpact(5)).toBe('HIGH');
    expect(unlockImpact(0.99)).toBe('LOW');
  });

  it('drops rows with no scheduled unlock or a tiny market cap', () => {
    expect(unlockToEvent({ ...row, next_unlock_date: 0 })).toBeNull();
    expect(unlockToEvent({ ...row, next_unlock_date: undefined })).toBeNull();
    expect(unlockToEvent({ ...row, market_cap: 10_000_000 })).toBeNull();
  });
});

describe('parseAdminWhen', () => {
  it('reads HH:MM from the time picker as UTC', () => {
    expect(parseAdminWhen('2026-10-20', '14:05')).toEqual({ ts: '2026-10-20T14:05:00.000Z', allDay: false });
  });
  it('reads legacy free-text times', () => {
    expect(parseAdminWhen('2026-10-20', '8:30 AM UTC')?.ts).toBe('2026-10-20T08:30:00.000Z');
    expect(parseAdminWhen('2026-10-20', '8:30 pm')?.ts).toBe('2026-10-20T20:30:00.000Z');
    expect(parseAdminWhen('2026-10-20', '12:00 AM')?.ts).toBe('2026-10-20T00:00:00.000Z');
  });
  it('treats a blank/unparseable time as all-day at 12:00 UTC', () => {
    expect(parseAdminWhen('2026-10-20', '')).toEqual({ ts: '2026-10-20T12:00:00.000Z', allDay: true });
    expect(parseAdminWhen('2026-10-20', 'after US close')?.allDay).toBe(true);
  });
  it('rejects a malformed date', () => {
    expect(parseAdminWhen('20/10/2026', '10:00')).toBeNull();
  });
});

describe('admin category / assets', () => {
  it('maps categories to calendar types', () => {
    expect(adminCategoryToType('Macro')).toBe('macro');
    expect(adminCategoryToType('Token unlock')).toBe('unlock');
    expect(adminCategoryToType('Regulatory')).toBe('protocol');
    expect(adminCategoryToType(undefined)).toBe('protocol');
  });
  it('parses tickers and defaults blank macro events to market-wide BTC', () => {
    expect(parseAdminAssets(' btc, eth ,BTC sol', 'protocol')).toEqual(['BTC', 'ETH', 'SOL']);
    expect(parseAdminAssets('', 'macro')).toEqual(['BTC']);
    expect(parseAdminAssets('', 'protocol')).toEqual([]);
  });
});

describe('adminToEvent', () => {
  it('builds a Kumami-sourced event', () => {
    const e = adminToEvent('abc', {
      t: 'ETH Fusaka upgrade', date: '2026-11-03', time: '', imp: 'high', cat: 'Project',
      d: 'Mainnet hard fork.', assets: 'ETH', status: 'published',
    });
    expect(e).toMatchObject({
      id: 'kumami-abc', type: 'protocol', impact: 'HIGH', assets: ['ETH'],
      source: 'kumami', allDay: true, category: 'Project',
    });
  });
  it('skips docs without a title or date', () => {
    expect(adminToEvent('x', { t: '', date: '2026-11-03' })).toBeNull();
    expect(adminToEvent('x', { t: 'Something' })).toBeNull();
  });
  it('defaults an unknown impact to MED', () => {
    expect(adminToEvent('x', { t: 'A', date: '2026-11-03', imp: 'huge' })?.impact).toBe('MED');
  });
});

describe('isAttentionEligible (popup scope, spec §7.3)', () => {
  const ev = (over: object) => ({
    id: '1', type: 'unlock' as const, title: 't', ts: '2026-10-10T00:00:00Z', impact: 'HIGH' as const,
    assets: ['XYZ'], description: '', source: 'feed' as const, ...over,
  });
  it('requires HIGH impact', () => {
    expect(isAttentionEligible(ev({ impact: 'MED', assets: ['BTC'] }))).toBe(false);
  });
  it('requires a Plus-roster asset for feed events', () => {
    expect(isAttentionEligible(ev({}))).toBe(false);
    expect(isAttentionEligible(ev({ assets: ['HYPE'] }))).toBe(true);
  });
  it('always lets team-added HIGH events through', () => {
    expect(isAttentionEligible(ev({ source: 'kumami', assets: [] }))).toBe(true);
  });
});

describe('mergeCalendarEvents', () => {
  it('merges every source chronologically', () => {
    const mk = (id: string, ts: string) => ({
      id, type: 'macro' as const, title: id, ts, impact: 'LOW' as const, assets: [], description: '',
    });
    const out = mergeCalendarEvents([mk('b', '2026-10-12T00:00:00Z')], [mk('a', '2026-10-11T00:00:00Z')], [mk('c', '2026-10-13T00:00:00Z')]);
    expect(out.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});
