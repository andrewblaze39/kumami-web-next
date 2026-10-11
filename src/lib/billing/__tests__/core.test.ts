import { describe, it, expect } from 'vitest';
import { PLANS, formatUsd, isPlanId, STRIPE_GRACE_MS } from '../plans';
import { CODE_ALPHABET, CODE_LENGTH, checkCode, ensureReferralCode, generateCode, normalizeCode } from '../referralCode';
import { cryptoProUntil, stripeEntitlement } from '../entitlement';
import { blockReason, createOrder } from '../checkout';
import { MemoryStore } from '../memoryStore';
import { BufferedTx } from '../store';

const DAY = 86_400_000;
const NOW = new Date(Date.UTC(2026, 9, 11, 12));

describe('plans (spec v1.13 Pro §21/§22)', () => {
  it('prices, durations and rewards match the spec', () => {
    expect(PLANS.monthly).toMatchObject({ priceCents: 1999, days: 30, referralRewardCents: 100 });
    expect(PLANS.yearly).toMatchObject({ priceCents: 19999, days: 365, referralRewardCents: 1000 });
    expect(Object.keys(PLANS)).toEqual(['monthly', 'yearly']); // no Lifetime
    expect(isPlanId('lifetime')).toBe(false);
  });
  it('formats cents', () => {
    expect(formatUsd(1999)).toBe('$19.99');
    expect(formatUsd(100)).toBe('$1.00');
    expect(formatUsd(-1000)).toBe('-$10.00');
    expect(formatUsd(0)).toBe('$0.00');
  });
});

describe('BufferedTx', () => {
  it('reads see earlier writes; merges layer over the stored doc', async () => {
    const s = new MemoryStore().seed('users/a', { x: 1, y: 2 });
    await s.runTransaction(async (tx) => {
      tx.set('users/a', { y: 3 }, { merge: true });
      expect(await tx.get('users/a')).toEqual({ x: 1, y: 3 });
      tx.set('users/b', { z: 1 });
      expect(await tx.get('users/b')).toEqual({ z: 1 });
    });
    expect(s.doc('users/a')).toEqual({ x: 1, y: 3 });
  });
  it('rejects bad paths', () => {
    const tx = new BufferedTx(async () => null);
    expect(() => tx.set('users', {})).toThrow();
  });
  it('a throwing transaction writes nothing', async () => {
    const s = new MemoryStore();
    await expect(s.runTransaction(async (tx) => { tx.set('users/a', { x: 1 }); throw new Error('boom'); })).rejects.toThrow();
    expect(s.doc('users/a')).toBeNull();
  });
});

describe('referral codes', () => {
  it('8 chars from the no-look-alike alphabet', () => {
    let i = 0;
    const code = generateCode(() => i++ % CODE_ALPHABET.length);
    expect(code).toHaveLength(CODE_LENGTH);
    for (const ch of code) expect(CODE_ALPHABET).toContain(ch);
    for (const bad of ['0', 'O', '1', 'I', 'L']) expect(CODE_ALPHABET).not.toContain(bad);
  });
  it('normalises input', () => {
    expect(normalizeCode('abcd-23xy')).toBe('ABCD23XY');
    expect(normalizeCode('ABCD 23XY')).toBe('ABCD23XY');
    expect(normalizeCode('ABCD23X0')).toBeNull(); // 0 not in alphabet
    expect(normalizeCode('ABC')).toBeNull();
    expect(normalizeCode(42)).toBeNull();
  });
  it('creates once, keeps the existing code, retries on collision', async () => {
    const s = new MemoryStore().seed('users/u1', {}).seed('users/u2', {});
    const seq = ['AAAAAAAA', 'AAAAAAAA', 'BBBBBBBB'];
    let call = 0;
    const randFor = () => { const c = seq[call++]; let k = 0; return () => CODE_ALPHABET.indexOf(c[k++]); };
    const r1 = await ensureReferralCode(s, 'u1', randFor(), NOW);
    expect(r1).toEqual({ ok: true, code: 'AAAAAAAA', created: true });
    // u2's first candidate collides with u1's → second attempt gets BBBBBBBB
    let attempt = 0;
    const r2 = await ensureReferralCode(s, 'u2', (n) => { void n; attempt++; return CODE_ALPHABET.indexOf(attempt <= 8 ? 'A' : 'B'); }, NOW);
    expect(r2).toEqual({ ok: true, code: 'BBBBBBBB', created: true });
    const again = await ensureReferralCode(s, 'u1', randFor(), NOW);
    expect(again).toEqual({ ok: true, code: 'AAAAAAAA', created: false });
    expect(s.doc('referralCodes/AAAAAAAA')?.userId).toBe('u1');
    expect(s.doc('referralCodes/BBBBBBBB')?.userId).toBe('u2');
  });
  it('concurrent ensure for one user yields one code', async () => {
    const s = new MemoryStore().seed('users/u1', {});
    let n = 0;
    const rand = () => (n++ % CODE_ALPHABET.length);
    const [a, b] = await Promise.all([ensureReferralCode(s, 'u1', rand, NOW), ensureReferralCode(s, 'u1', rand, NOW)]);
    expect(a.ok && b.ok && a.code === b.code).toBe(true);
    expect(s.collection('referralCodes')).toHaveLength(1);
  });
  it('missing user → user_not_found', async () => {
    expect(await ensureReferralCode(new MemoryStore(), 'nope', () => 0, NOW)).toEqual({ ok: false, reason: 'user_not_found' });
  });
  it('validates: not_found / own_code / malformed / valid', async () => {
    const s = new MemoryStore().seed('referralCodes/ABCDEFGH', { userId: 'u1' });
    expect(await checkCode(s, 'abcdefgh', 'u2')).toEqual({ valid: true, ownerUid: 'u1' });
    expect(await checkCode(s, 'ABCDEFGH', 'u1')).toEqual({ valid: false, reason: 'own_code' });
    expect(await checkCode(s, 'ZZZZZZZZ', 'u2')).toEqual({ valid: false, reason: 'not_found' });
    expect(await checkCode(s, 'x', null)).toEqual({ valid: false, reason: 'malformed' });
  });
});

describe('entitlement', () => {
  const base = { id: 'sub_1', cancelAtPeriodEnd: false, periodStartMs: NOW.getTime(), periodEndMs: NOW.getTime() + 30 * DAY, endedAtMs: null };
  it('active → Pro until period end + 3-day grace', () => {
    expect(stripeEntitlement({ ...base, status: 'active' }, NOW.getTime())).toEqual({
      isPremium: true, proUntil: new Date(base.periodEndMs + STRIPE_GRACE_MS), subscriptionStatus: 'active', cancelAtPeriodEnd: false,
    });
  });
  it('cancel at period end → "canceling", still Pro', () => {
    expect(stripeEntitlement({ ...base, status: 'active', cancelAtPeriodEnd: true }, NOW.getTime())?.subscriptionStatus).toBe('canceling');
  });
  it('past_due keeps Pro only to the previous period end + grace', () => {
    const e = stripeEntitlement({ ...base, status: 'past_due' }, NOW.getTime());
    expect(e?.isPremium).toBe(true);
    expect(e?.proUntil.getTime()).toBe(base.periodStartMs + STRIPE_GRACE_MS);
  });
  it('canceled / unpaid / incomplete_expired → off; incomplete → no change', () => {
    for (const status of ['canceled', 'unpaid', 'incomplete_expired', 'paused']) {
      expect(stripeEntitlement({ ...base, status, endedAtMs: NOW.getTime() }, NOW.getTime())?.isPremium).toBe(false);
    }
    expect(stripeEntitlement({ ...base, status: 'incomplete_expired' }, NOW.getTime())?.subscriptionStatus).toBe('expired');
    expect(stripeEntitlement({ ...base, status: 'incomplete' }, NOW.getTime())).toBeNull();
  });
  it('crypto stacks on remaining crypto time only', () => {
    const t = NOW.getTime();
    expect(cryptoProUntil({}, 30, t).getTime()).toBe(t + 30 * DAY);
    expect(cryptoProUntil({ isPremium: true, proSource: 'crypto', proUntil: t + 10 * DAY }, 30, t).getTime()).toBe(t + 40 * DAY);
    expect(cryptoProUntil({ isPremium: true, proSource: 'crypto', proUntil: t - DAY }, 30, t).getTime()).toBe(t + 30 * DAY);
    expect(cryptoProUntil({ isPremium: true, proSource: 'admin', proUntil: t + 10 * DAY }, 30, t).getTime()).toBe(t + 30 * DAY);
  });
});

describe('checkout guards', () => {
  const t = NOW.getTime();
  it('no second subscription while Pro; crypto may extend crypto', () => {
    expect(blockReason({}, 'stripe', t)).toBeNull();
    expect(blockReason({}, 'crypto', t)).toBeNull();
    const cardPro = { isPremium: true, proUntil: new Date(t + DAY), proSource: 'stripe', stripeSubscriptionId: 's', subscriptionStatus: 'active' };
    expect(blockReason(cardPro, 'stripe', t)).toBe('already_subscribed');
    expect(blockReason(cardPro, 'crypto', t)).toBe('already_subscribed');
    const cryptoPro = { isPremium: true, proUntil: new Date(t + DAY), proSource: 'crypto' };
    expect(blockReason(cryptoPro, 'crypto', t)).toBeNull();
    expect(blockReason(cryptoPro, 'stripe', t)).toBe('already_subscribed');
    const adminPro = { isPremium: true, proUntil: null, proSource: 'admin' };
    expect(blockReason(adminPro, 'crypto', t)).toBe('already_subscribed');
    const expired = { isPremium: true, proUntil: new Date(t - DAY), proSource: 'crypto' };
    expect(blockReason(expired, 'stripe', t)).toBeNull();
  });
  it('createOrder validates the code and stores a pending order', async () => {
    const s = new MemoryStore().seed('users/u1', { referralCode: 'AAAAAAAA' }).seed('users/u2', {})
      .seed('referralCodes/AAAAAAAA', { userId: 'u1' });
    const own = await createOrder(s, { uid: 'u1', provider: 'stripe', plan: 'monthly', referralCode: 'AAAAAAAA' }, { now: NOW, newId: () => 'o1' });
    expect(own).toMatchObject({ ok: false, error: { code: 'invalid_referral_code', reason: 'own_code' } });
    const ok = await createOrder(s, { uid: 'u2', provider: 'crypto', plan: 'yearly', referralCode: 'aaaa-aaaa' }, { now: NOW, newId: () => 'o2' });
    expect(ok).toMatchObject({ ok: true, orderId: 'o2', referralCode: 'AAAAAAAA' });
    expect(s.doc('checkout_orders/o2')).toMatchObject({ userId: 'u2', provider: 'crypto', plan: 'yearly', amountCents: 19999, status: 'pending' });
  });
});
