import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CalendarEvent } from '@/lib/market/contracts';

const auth = vi.hoisted(() => ({ tier: 'free' as 'free' | 'pro' }));

vi.mock('@/lib/market/api-helpers', () => ({
  authenticate: vi.fn(async () => ({ uid: 'u1', tier: auth.tier })),
}));

const base: Omit<CalendarEvent, 'id'> = { type: 'protocol', title: 'E', ts: '2026-11-03T12:00:00.000Z', impact: 'MED', assets: [], description: '', source: 'kumami' };
const events: CalendarEvent[] = [
  { ...base, id: 'kumami-legacy' },
  { ...base, id: 'kumami-plus', audience: { plus: true, pro: false } },
  { ...base, id: 'kumami-pro', audience: { plus: false, pro: true } },
  { ...base, id: 'airdrop-x' }, // airdrops are 'protocol' events, known by the id prefix
];

vi.mock('@/lib/market/provider', () => ({
  getProvider: () => ({ calendar: async () => ({ events, updatedAt: '2026-10-29T00:00:00.000Z' }) }),
}));

import { GET } from '../route';

async function ids(tier: 'free' | 'pro') {
  auth.tier = tier;
  const res = await GET(new Request('http://localhost/api/market/calendar'));
  const body = (await res.json()) as { events: CalendarEvent[] };
  return body.events.map((e) => e.id);
}

describe('GET /api/market/calendar — tier filtering', () => {
  beforeEach(() => { auth.tier = 'free'; });

  it('Plus sees legacy and Plus events, no Pro-only events and no airdrops', async () => {
    expect(await ids('free')).toEqual(['kumami-legacy', 'kumami-plus']);
  });

  it('Pro sees legacy, Pro events and airdrops, not Plus-only events', async () => {
    expect(await ids('pro')).toEqual(['kumami-legacy', 'kumami-pro', 'airdrop-x']);
  });
});
