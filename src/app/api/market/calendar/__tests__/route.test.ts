import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CalendarEvent } from '@/lib/market/contracts';

const auth = vi.hoisted(() => ({ tier: 'free' as 'free' | 'pro' }));

vi.mock('@/lib/market/api-helpers', () => ({
  authenticate: vi.fn(async () => ({ uid: 'u1', tier: auth.tier })),
}));

const base: Omit<CalendarEvent, 'id'> = { type: 'protocol', title: 'E', ts: '2026-11-03T12:00:00.000Z', impact: 'MED', assets: [], description: '', source: 'kumami' };
const events: CalendarEvent[] = [
  { ...base, id: 'kumami-legacy' },
  { ...base, id: 'kumami-plus', audience: { plus: true, pro: true } },
  { ...base, id: 'kumami-pro', audience: { plus: false, pro: true } },
  { ...base, id: 'airdrop-x' }, // airdrops are 'protocol' events, known by the id prefix
];

vi.mock('@/lib/market/provider', () => ({
  getProvider: () => ({ calendar: async () => ({ events, updatedAt: '2026-10-29T00:00:00.000Z' }) }),
}));

import { GET } from '../route';

async function call(tier: 'free' | 'pro', view?: string) {
  auth.tier = tier;
  const res = await GET(new Request(`http://localhost/api/market/calendar${view ? `?view=${view}` : ''}`));
  return { status: res.status, body: (await res.json()) as { events?: CalendarEvent[]; error?: string } };
}
const ids = (r: { body: { events?: CalendarEvent[] } }) => (r.body.events ?? []).map((e) => e.id);

describe('GET /api/market/calendar — Calendar Plus and Calendar Pro', () => {
  beforeEach(() => { auth.tier = 'free'; });

  it('Calendar Plus (default) for a Plus user: legacy and Plus events, no Pro-only events, no airdrops', async () => {
    expect(ids(await call('free'))).toEqual(['kumami-legacy', 'kumami-plus']);
  });

  it('Calendar Plus for a Pro user is the same Plus calendar (airdrops only in Calendar Pro)', async () => {
    expect(ids(await call('pro'))).toEqual(['kumami-legacy', 'kumami-plus']);
  });

  it('Calendar Pro for a Pro user adds the Pro-only events and airdrops', async () => {
    expect(ids(await call('pro', 'pro'))).toEqual(['kumami-legacy', 'kumami-plus', 'kumami-pro', 'airdrop-x']);
  });

  it('Calendar Pro is refused for a Plus user', async () => {
    const r = await call('free', 'pro');
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('pro_required');
  });
});
