import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../memoryStore';
import { handleStripeEvent, type StripeDeps, type StripeSubFull, type StripeEventLike } from '../stripeWebhook';
import { handleIpn, signIpn, verifyIpn, sortDeep } from '../nowpayments';
import { STRIPE_GRACE_MS, type PlanId } from '../plans';
import { toMillis } from '@/lib/pro';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 11, 12);

/** users' referral balance must always equal the sum of their ledger rows. */
function assertLedger(s: MemoryStore) {
  for (const [uid, u] of s.collection('users')) {
    const sum = s.collection('referral_ledger').filter(([, r]) => r.userId === uid).reduce((a, [, r]) => a + Number(r.amountCents), 0);
    expect(Number(u.referralBalanceCents ?? 0), `ledger for ${uid}`).toBe(sum);
  }
}

describe('Stripe webhook', () => {
  let store: MemoryStore;
  let sub: StripeSubFull;
  let cancelled: string[];
  let clock: number;
  const price: Record<string, PlanId> = { price_m: 'monthly', price_y: 'yearly' };

  const deps = (): StripeDeps => ({
    store,
    now: () => new Date(clock),
    retrieveSubscription: async () => structuredClone(sub),
    invoicePaymentIntent: async (inv) => `pi_${inv}`,
    cancelSubscriptionNow: async (id) => {
      cancelled.push(id);
      sub.snapshot.status = 'canceled';
      sub.snapshot.endedAtMs = clock;
    },
    planForPrice: (p) => (p ? price[p] ?? null : null),
  });

  const ev = (id: string, type: string, object: Record<string, unknown>): StripeEventLike => ({ id, type, data: { object } });
  const invoicePaid = (id: string, invoiceId: string, amount = 1999, reason = 'subscription_create') =>
    ev(id, 'invoice.paid', { id: invoiceId, amount_paid: amount, currency: 'usd', billing_reason: reason, parent: { subscription_details: { subscription: 'sub_1' } } });

  beforeEach(() => {
    clock = T0;
    cancelled = [];
    store = new MemoryStore()
      .seed('users/payer', { email: 'p@x', stripeCustomerId: 'cus_1' })
      .seed('users/ref', { referralCode: 'REFAAAAA', referralBalanceCents: 0, referralCount: 0 })
      .seed('referralCodes/REFAAAAA', { userId: 'ref' })
      .seed('checkout_orders/o1', { userId: 'payer', provider: 'stripe', plan: 'monthly', amountCents: 1999, referralCode: 'REFAAAAA', status: 'pending' });
    sub = {
      snapshot: { id: 'sub_1', status: 'active', cancelAtPeriodEnd: false, periodStartMs: T0, periodEndMs: T0 + 30 * DAY, endedAtMs: null },
      customerId: 'cus_1', priceId: 'price_m', metadata: { uid: 'payer', plan: 'monthly', orderId: 'o1' },
    };
  });

  it('first payment: Pro on, payment + subscription recorded, referral credited to both', async () => {
    const r = await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    expect(r).toEqual({ status: 'applied', detail: 'paid+referral' });
    const u = store.doc('users/payer')!;
    expect(u).toMatchObject({ isPremium: true, proSource: 'stripe', plan: 'monthly', subscriptionStatus: 'active', stripeSubscriptionId: 'sub_1' });
    expect(toMillis(u.proUntil as Date)).toBe(T0 + 30 * DAY + STRIPE_GRACE_MS);
    expect(store.doc('payments/stripe_in_1')).toMatchObject({ amountCents: 1999, isFirstPayment: true, status: 'paid', stripePaymentIntentId: 'pi_in_1' });
    expect(store.doc('checkout_orders/o1')?.status).toBe('paid');
    expect(store.doc('users/ref')).toMatchObject({ referralBalanceCents: 100, referralCount: 1 });
    expect(u.referralBalanceCents).toBe(100);
    expect(u.referredBy).toBe('ref');
    assertLedger(store);
  });

  it('the same event twice is applied once; a different event for the same invoice does not double-pay', async () => {
    await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    expect(await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps())).toEqual({ status: 'duplicate' });
    const r = await handleStripeEvent(invoicePaid('evt_1b', 'in_1'), deps());
    expect(r.detail).toBe('payment_already_recorded');
    expect(store.doc('users/ref')?.referralBalanceCents).toBe(100);
    expect(store.collection('payments')).toHaveLength(1);
    assertLedger(store);
  });

  it('renewal: period moves on, second payment, no extra referral', async () => {
    await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    clock = T0 + 30 * DAY;
    sub.snapshot.periodStartMs = clock;
    sub.snapshot.periodEndMs = clock + 30 * DAY;
    const r = await handleStripeEvent(invoicePaid('evt_2', 'in_2', 1999, 'subscription_cycle'), deps());
    expect(r.detail).toBe('paid');
    expect(toMillis(store.doc('users/payer')!.proUntil as Date)).toBe(clock + 30 * DAY + STRIPE_GRACE_MS);
    expect(store.doc('payments/stripe_in_2')?.isFirstPayment).toBe(false);
    expect(store.doc('users/ref')?.referralBalanceCents).toBe(100);
  });

  it('subscription events arriving before invoice.paid do not grant twice or break', async () => {
    await handleStripeEvent(ev('evt_c', 'checkout.session.completed', { mode: 'subscription', subscription: 'sub_1' }), deps());
    expect(store.doc('users/payer')?.isPremium).toBe(true); // active subscription → Pro
    await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    expect(store.doc('users/ref')?.referralBalanceCents).toBe(100);
  });

  it('cancel at period end then deleted: canceling, then Pro off', async () => {
    await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    sub.snapshot.cancelAtPeriodEnd = true;
    await handleStripeEvent(ev('evt_u', 'customer.subscription.updated', { id: 'sub_1' }), deps());
    expect(store.doc('users/payer')).toMatchObject({ isPremium: true, subscriptionStatus: 'canceling', cancelAtPeriodEnd: true });
    clock = T0 + 30 * DAY;
    sub.snapshot.status = 'canceled';
    sub.snapshot.endedAtMs = clock;
    await handleStripeEvent(ev('evt_d', 'customer.subscription.deleted', { id: 'sub_1' }), deps());
    expect(store.doc('users/payer')).toMatchObject({ isPremium: false, subscriptionStatus: 'canceled' });
    expect(store.doc('subscriptions/sub_1')?.status).toBe('canceled');
  });

  it('failed renewal: past_due keeps Pro only through the grace', async () => {
    await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    clock = T0 + 30 * DAY;
    Object.assign(sub.snapshot, { status: 'past_due', periodStartMs: clock, periodEndMs: clock + 30 * DAY });
    await handleStripeEvent(ev('evt_f', 'invoice.payment_failed', { id: 'in_2', parent: { subscription_details: { subscription: 'sub_1' } } }), deps());
    const u = store.doc('users/payer')!;
    expect(u.subscriptionStatus).toBe('past_due');
    expect(toMillis(u.proUntil as Date)).toBe(clock + STRIPE_GRACE_MS);
  });

  it('a cancelled Stripe subscription never removes an admin grant', async () => {
    store.seed('users/payer', { isPremium: true, proUntil: null, proSource: 'admin', stripeCustomerId: 'cus_1' });
    Object.assign(sub.snapshot, { status: 'canceled', endedAtMs: T0 });
    await handleStripeEvent(ev('evt_d', 'customer.subscription.deleted', { id: 'sub_1' }), deps());
    expect(store.doc('users/payer')).toMatchObject({ isPremium: true, proSource: 'admin' });
  });

  it('full refund of the first payment: payment refunded, referral reversed, subscription cancelled now', async () => {
    await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    const r = await handleStripeEvent(ev('evt_r', 'charge.refunded', { payment_intent: 'pi_in_1', amount: 1999, amount_refunded: 1999 }), deps());
    expect(r.detail).toBe('refunded+referral_reversed');
    expect(cancelled).toEqual(['sub_1']);
    expect(store.doc('payments/stripe_in_1')?.status).toBe('refunded');
    expect(store.doc('users/ref')).toMatchObject({ referralBalanceCents: 0, referralCount: 0 });
    expect(store.doc('users/payer')?.referralBalanceCents).toBe(0);
    expect(store.doc('referral_rewards/payer')?.status).toBe('reversed');
    assertLedger(store);
    // replayed refund: no double reversal
    expect(await handleStripeEvent(ev('evt_r', 'charge.refunded', { payment_intent: 'pi_in_1', amount: 1999, amount_refunded: 1999 }), deps())).toEqual({ status: 'duplicate' });
    assertLedger(store);
    // Stripe then sends subscription.deleted → Pro off
    await handleStripeEvent(ev('evt_d', 'customer.subscription.deleted', { id: 'sub_1' }), deps());
    expect(store.doc('users/payer')?.isPremium).toBe(false);
  });

  it('partial refund still reverses the full reward (Andrew) but does not cancel', async () => {
    await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    await handleStripeEvent(ev('evt_r', 'charge.refunded', { payment_intent: 'pi_in_1', amount: 1999, amount_refunded: 500 }), deps());
    expect(cancelled).toEqual([]);
    expect(store.doc('payments/stripe_in_1')?.status).toBe('partially_refunded');
    expect(store.doc('users/ref')?.referralBalanceCents).toBe(0);
  });

  it('one reward per new user: a later payment with a different code pays nobody', async () => {
    await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    store.seed('users/ref2', { referralCode: 'REFBBBBB' }).seed('referralCodes/REFBBBBB', { userId: 'ref2' })
      .seed('checkout_orders/o2', { userId: 'payer', provider: 'stripe', plan: 'yearly', amountCents: 19999, referralCode: 'REFBBBBB', status: 'pending' });
    sub = { ...sub, snapshot: { ...sub.snapshot, id: 'sub_2' }, priceId: 'price_y', metadata: { uid: 'payer', plan: 'yearly', orderId: 'o2' } };
    store.seed('users/payer', { ...store.doc('users/payer'), stripeSubscriptionId: 'sub_2' });
    const r = await handleStripeEvent(invoicePaid('evt_2', 'in_9', 19999), deps());
    expect(r.detail).toBe('paid');
    expect(store.doc('users/ref2')?.referralBalanceCents ?? 0).toBe(0);
    assertLedger(store);
  });

  it('a referrer is credited for each different new user', async () => {
    await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    store.seed('users/payer2', {}).seed('checkout_orders/o3', { userId: 'payer2', provider: 'stripe', plan: 'yearly', amountCents: 19999, referralCode: 'REFAAAAA', status: 'pending' });
    sub = { snapshot: { ...sub.snapshot, id: 'sub_3' }, customerId: 'cus_2', priceId: 'price_y', metadata: { uid: 'payer2', plan: 'yearly', orderId: 'o3' } };
    await handleStripeEvent(ev('evt_3', 'invoice.paid', { id: 'in_3', amount_paid: 19999, currency: 'usd', parent: { subscription_details: { subscription: 'sub_3' } } }), deps());
    expect(store.doc('users/ref')).toMatchObject({ referralBalanceCents: 1100, referralCount: 2 });
    expect(store.doc('users/payer2')?.referralBalanceCents).toBe(1000);
    assertLedger(store);
  });

  it('after the payer deleted their account: payment still recorded, user doc never recreated', async () => {
    store.docs.delete('users/payer');
    const r = await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    expect(r.status).toBe('applied');
    expect(store.doc('payments/stripe_in_1')).toMatchObject({ userId: 'payer', status: 'paid', referralResult: 'payer_missing' });
    expect(store.doc('users/payer')).toBeNull();
    expect(store.doc('users/ref')?.referralBalanceCents).toBe(0);
  });

  it('refund after the referrer deleted their account: reversal recorded, referrer doc never recreated', async () => {
    await handleStripeEvent(invoicePaid('evt_1', 'in_1'), deps());
    store.docs.delete('users/ref');
    const r = await handleStripeEvent(ev('evt_r', 'charge.refunded', { payment_intent: 'pi_in_1', amount: 1999, amount_refunded: 1999 }), deps());
    expect(r.detail).toBe('refunded+referral_reversed');
    expect(store.doc('users/ref')).toBeNull();
    expect(store.doc('users/payer')?.referralBalanceCents).toBe(0);
    assertLedger(store);
  });

  it('unknown user / unrelated events are ignored but recorded', async () => {
    sub.metadata = {};
    sub.customerId = 'cus_unknown';
    expect(await handleStripeEvent(invoicePaid('evt_x', 'in_x'), deps())).toEqual({ status: 'ignored', detail: 'user_not_found' });
    expect(store.doc('webhook_events/stripe_evt_x')).toBeTruthy();
    expect((await handleStripeEvent(ev('evt_y', 'customer.created', {}), deps())).status).toBe('ignored');
  });
});

describe('NOWPayments IPN', () => {
  const SECRET = 'ipn_secret_test';
  let store: MemoryStore;
  let clock: number;
  const deps = () => ({ store, now: () => new Date(clock) });
  const ipn = (over: Record<string, unknown>) => ({
    payment_id: 5001, invoice_id: 77, order_id: 'c1', payment_status: 'finished',
    price_amount: 199.99, price_currency: 'usd', pay_currency: 'usdttrc20', actually_paid: 200.1, ...over,
  });

  beforeEach(() => {
    clock = T0;
    store = new MemoryStore()
      .seed('users/payer', {})
      .seed('users/ref', { referralCode: 'REFAAAAA' })
      .seed('referralCodes/REFAAAAA', { userId: 'ref' })
      .seed('checkout_orders/c1', { userId: 'payer', provider: 'crypto', plan: 'yearly', amountCents: 19999, referralCode: 'REFAAAAA', status: 'pending' });
  });

  it('signature: sorted at every level; tampering or a missing header fails', () => {
    const body = { b: 1, a: { d: [1, { z: 1, y: 2 }], c: 'x' } };
    expect(JSON.stringify(sortDeep(body))).toBe('{"a":{"c":"x","d":[1,{"y":2,"z":1}]},"b":1}');
    const sig = signIpn(body, SECRET);
    expect(verifyIpn({ a: { c: 'x', d: [1, { y: 2, z: 1 }] }, b: 1 }, sig, SECRET)).toBe(true); // key order irrelevant
    expect(verifyIpn({ ...body, b: 2 }, sig, SECRET)).toBe(false);
    expect(verifyIpn(body, null, SECRET)).toBe(false);
    expect(verifyIpn(body, sig, '')).toBe(false);
    expect(verifyIpn(body, 'abc', SECRET)).toBe(false);
  });

  it('finished: Pro for 365 days, both credited $10; replay changes nothing', async () => {
    expect(await handleIpn(ipn({}), deps())).toEqual({ status: 'applied', detail: 'paid+referral' });
    const u = store.doc('users/payer')!;
    expect(u).toMatchObject({ isPremium: true, proSource: 'crypto', plan: 'yearly' });
    expect(toMillis(u.proUntil as Date)).toBe(T0 + 365 * DAY);
    expect(store.doc('users/ref')?.referralBalanceCents).toBe(1000);
    expect(u.referralBalanceCents).toBe(1000);
    expect(await handleIpn(ipn({}), deps())).toEqual({ status: 'duplicate', detail: 'finished' });
    expect(store.doc('users/ref')?.referralBalanceCents).toBe(1000);
    assertLedger(store);
  });

  it('a second crypto purchase stacks days and pays no second referral', async () => {
    await handleIpn(ipn({}), deps());
    store.seed('checkout_orders/c2', { userId: 'payer', provider: 'crypto', plan: 'monthly', amountCents: 1999, referralCode: 'REFAAAAA', status: 'pending' });
    clock = T0 + 10 * DAY;
    await handleIpn(ipn({ payment_id: 5002, order_id: 'c2', price_amount: 19.99 }), deps());
    expect(toMillis(store.doc('users/payer')!.proUntil as Date)).toBe(T0 + 395 * DAY);
    expect(store.doc('users/ref')?.referralBalanceCents).toBe(1000);
  });

  it('amount mismatch → review, no Pro', async () => {
    expect((await handleIpn(ipn({ price_amount: 1 }), deps())).detail).toBe('amount_mismatch');
    expect(store.doc('users/payer')?.isPremium).toBeUndefined();
    expect(store.doc('checkout_orders/c1')?.status).toBe('review');
  });

  it('partially_paid → no Pro; finished after it still activates', async () => {
    expect((await handleIpn(ipn({ payment_status: 'partially_paid' }), deps())).detail).toBe('partially_paid');
    expect(store.doc('users/payer')?.isPremium).toBeUndefined();
    expect((await handleIpn(ipn({}), deps())).detail).toBe('paid+referral');
  });

  it('unknown order is ignored safely', async () => {
    expect((await handleIpn(ipn({ order_id: 'nope' }), deps())).detail).toBe('unknown_order');
  });

  it('refund reverses the referral and takes the days back', async () => {
    await handleIpn(ipn({}), deps());
    expect((await handleIpn(ipn({ payment_status: 'refunded' }), deps())).detail).toBe('refunded+referral_reversed');
    expect(store.doc('users/payer')).toMatchObject({ isPremium: false, subscriptionStatus: 'canceled' });
    expect(store.doc('users/ref')?.referralBalanceCents).toBe(0);
    assertLedger(store);
  });
});
