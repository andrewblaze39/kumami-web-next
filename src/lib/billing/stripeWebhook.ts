/**
 * Stripe webhook core (spec v1.13 Pro §21). The route verifies the signature;
 * this module applies an already-verified event. Rules:
 *  - each event id is applied once (webhook_events, same transaction as the change);
 *  - subscription state is re-read from Stripe, never trusted from event order;
 *  - money is integer cents; referral rewards run inside the payment transaction.
 * Pure apart from the injected deps — unit-tested against MemoryStore.
 */
import { isProActive, toMillis } from '@/lib/pro';
import { stripeEntitlement, type StripeSubSnapshot } from './entitlement';
import { isPlanId, type PlanId } from './plans';
import { applyReferralReward, reverseReferralReward } from './referral';
import { safeId, type Doc, type Store, type Tx } from './store';

export interface StripeSubFull {
  snapshot: StripeSubSnapshot;
  customerId: string | null;
  priceId: string | null;
  metadata: Record<string, string>;
}

export interface StripeDeps {
  store: Store;
  now: () => Date;
  retrieveSubscription(id: string): Promise<StripeSubFull>;
  /** PaymentIntent id behind a paid invoice (for refund matching), or null. */
  invoicePaymentIntent(invoiceId: string): Promise<string | null>;
  /** Cancel immediately (refund / chargeback). Must tolerate an already-cancelled subscription. */
  cancelSubscriptionNow(id: string): Promise<void>;
  planForPrice(priceId: string | null): PlanId | null;
}

/** The parts of a Stripe event this handler reads. */
export interface StripeEventLike {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export type HandleResult = { status: 'applied' | 'duplicate' | 'ignored'; detail?: string };

const SUB_EVENTS = new Set([
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

export async function handleStripeEvent(evt: StripeEventLike, deps: StripeDeps): Promise<HandleResult> {
  const obj = evt.data.object;
  const now = deps.now();

  if (SUB_EVENTS.has(evt.type)) {
    const subId = subscriptionIdOf(evt.type, obj);
    if (!subId) return record(deps, evt, now, 'ignored', 'no_subscription');
    const sub = await deps.retrieveSubscription(subId);
    const uid = sub.metadata.uid || (sub.customerId ? (await deps.store.findOne('users', 'stripeCustomerId', sub.customerId))?.id : undefined);
    if (!uid) return record(deps, evt, now, 'ignored', 'user_not_found');

    const paymentIntentId = evt.type === 'invoice.paid' ? await deps.invoicePaymentIntent(String(obj.id)) : null;

    return deps.store.runTransaction(async (tx) => {
      if (await seen(tx, evt)) return { status: 'duplicate' } as const;
      let detail = 'synced';
      if (evt.type === 'invoice.paid') detail = await recordInvoicePaid(tx, deps, { invoice: obj, sub, uid, paymentIntentId, now });
      await syncSubscription(tx, deps, uid, sub, now);
      markSeen(tx, evt, now, detail);
      return { status: 'applied', detail } as const;
    });
  }

  if (evt.type === 'charge.refunded' || evt.type === 'charge.dispute.created') {
    const pi = typeof obj.payment_intent === 'string' ? obj.payment_intent : null;
    const found = pi ? await deps.store.findOne('payments', 'stripePaymentIntentId', pi) : null;
    if (!found) return record(deps, evt, now, 'ignored', 'payment_not_found');

    const isDispute = evt.type === 'charge.dispute.created';
    const full = isDispute || num(obj.amount_refunded) >= num(obj.amount);
    const subId = typeof found.data.stripeSubscriptionId === 'string' ? found.data.stripeSubscriptionId : null;
    // Cancel first: if the transaction below fails, Stripe retries and the cancel is a no-op.
    // The resulting customer.subscription.deleted event switches Pro off.
    if (full && subId) await deps.cancelSubscriptionNow(subId);

    return deps.store.runTransaction(async (tx) => {
      if (await seen(tx, evt)) return { status: 'duplicate' } as const;
      const payPath = `payments/${found.id}`;
      const payment = (await tx.get(payPath)) ?? {};
      const payerUid = String(payment.userId);
      tx.set(payPath, isDispute
        ? { status: 'disputed', disputedAt: now }
        : { status: full ? 'refunded' : 'partially_refunded', refundedCents: num(obj.amount_refunded), refundedAt: now }, { merge: true });
      // Andrew (11 Oct 2026): any refund of the rewarded payment reverses the full reward.
      const reversed = await reverseReferralReward(tx, { payerUid, paymentId: found.id, now, reason: isDispute ? 'dispute' : 'refund' });
      const detail = `${isDispute ? 'disputed' : full ? 'refunded' : 'partially_refunded'}${reversed ? '+referral_reversed' : ''}`;
      markSeen(tx, evt, now, detail);
      return { status: 'applied', detail } as const;
    });
  }

  return { status: 'ignored', detail: 'unhandled_type' };
}

function subscriptionIdOf(type: string, obj: Record<string, unknown>): string | null {
  if (type.startsWith('customer.subscription.')) return str(obj.id);
  if (type === 'checkout.session.completed') return obj.mode === 'subscription' ? str(obj.subscription) : null;
  // invoice.*: API 2025-03-31.basil+ moved the link to parent.subscription_details.subscription
  const parent = obj.parent as { subscription_details?: { subscription?: unknown } | null } | null | undefined;
  const s = parent?.subscription_details?.subscription;
  if (typeof s === 'string') return s;
  if (s && typeof s === 'object' && 'id' in s) return str((s as { id: unknown }).id);
  return null;
}

async function recordInvoicePaid(
  tx: Tx,
  deps: StripeDeps,
  p: { invoice: Record<string, unknown>; sub: StripeSubFull; uid: string; paymentIntentId: string | null; now: Date },
): Promise<string> {
  const invoiceId = String(p.invoice.id);
  const paymentId = `stripe_${safeId(invoiceId)}`;
  const payPath = `payments/${paymentId}`;
  if (await tx.get(payPath)) return 'payment_already_recorded';

  const user = (await tx.get(`users/${p.uid}`)) ?? {};
  const orderId = p.sub.metadata.orderId || null;
  const order = orderId ? await tx.get(`checkout_orders/${orderId}`) : null;
  const plan = deps.planForPrice(p.sub.priceId) ?? (isPlanId(p.sub.metadata.plan) ? p.sub.metadata.plan : null);
  if (!plan) return 'unknown_plan';
  const isFirstPayment = !user.firstPaidAt;

  const referral = await applyReferralReward(tx, {
    payerUid: p.uid, code: order?.referralCode ?? null, plan, paymentId, isFirstPayment, now: p.now,
  });

  tx.set(payPath, {
    userId: p.uid, provider: 'stripe', plan,
    amountCents: num(p.invoice.amount_paid), currency: String(p.invoice.currency ?? 'usd'),
    periodStart: new Date(p.sub.snapshot.periodStartMs), periodEnd: new Date(p.sub.snapshot.periodEndMs),
    orderId, isFirstPayment, status: 'paid', billingReason: str(p.invoice.billing_reason),
    stripeInvoiceId: invoiceId, stripePaymentIntentId: p.paymentIntentId, stripeSubscriptionId: p.sub.snapshot.id,
    referralRewardId: referral.applied ? referral.rewardId : null,
    referralResult: referral.applied ? 'credited' : referral.reason,
    createdAt: p.now,
  });
  if (isFirstPayment) tx.set(`users/${p.uid}`, { firstPaidAt: p.now }, { merge: true });
  if (order && order.status !== 'paid') {
    tx.set(`checkout_orders/${orderId}`, { status: 'paid', paidAt: p.now, paymentId, providerRef: p.sub.snapshot.id }, { merge: true });
  }
  return referral.applied ? 'paid+referral' : 'paid';
}

async function syncSubscription(tx: Tx, deps: StripeDeps, uid: string, sub: StripeSubFull, now: Date): Promise<void> {
  const s = sub.snapshot;
  const plan = deps.planForPrice(sub.priceId) ?? (isPlanId(sub.metadata.plan) ? sub.metadata.plan : null);
  tx.set(`subscriptions/${safeId(s.id)}`, {
    userId: uid, provider: 'stripe', plan, status: s.status, cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    currentPeriodStart: new Date(s.periodStartMs), currentPeriodEnd: new Date(s.periodEndMs),
    endedAt: s.endedAtMs ? new Date(s.endedAtMs) : null, stripeCustomerId: sub.customerId, updatedAt: now,
  }, { merge: true });

  const ent = stripeEntitlement(s, now.getTime());
  if (!ent) return;
  const user = await tx.get(`users/${uid}`);
  if (!user) return;
  const userView = { isPremium: user.isPremium, proUntil: toMillis(user.proUntil as Date) };

  if (ent.isPremium) {
    // Don't let an old subscription overwrite a different, currently active one.
    if (user.proSource === 'stripe' && user.stripeSubscriptionId && user.stripeSubscriptionId !== s.id && isProActive(userView, now.getTime())) return;
    tx.set(`users/${uid}`, {
      isPremium: true, proUntil: ent.proUntil, proSource: 'stripe', plan,
      subscriptionStatus: ent.subscriptionStatus, cancelAtPeriodEnd: ent.cancelAtPeriodEnd,
      stripeSubscriptionId: s.id, ...(sub.customerId ? { stripeCustomerId: sub.customerId } : {}),
    }, { merge: true });
  } else if (user.proSource === 'stripe' && user.stripeSubscriptionId === s.id) {
    // Only revoke Pro that this subscription granted (never an admin or crypto grant).
    tx.set(`users/${uid}`, {
      isPremium: false, proUntil: ent.proUntil, subscriptionStatus: ent.subscriptionStatus, cancelAtPeriodEnd: false,
    }, { merge: true });
  }
}

async function seen(tx: Tx, evt: StripeEventLike): Promise<boolean> {
  return (await tx.get(eventPath(evt))) !== null;
}

function markSeen(tx: Tx, evt: StripeEventLike, now: Date, result: string): void {
  tx.set(eventPath(evt), { provider: 'stripe', type: evt.type, result, processedAt: now });
}

function eventPath(evt: StripeEventLike): string {
  return `webhook_events/stripe_${safeId(evt.id)}`;
}

async function record(deps: StripeDeps, evt: StripeEventLike, now: Date, status: 'ignored', detail: string): Promise<HandleResult> {
  await deps.store.runTransaction(async (tx) => {
    if (!(await seen(tx, evt))) markSeen(tx, evt, now, detail);
  });
  return { status, detail };
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export type { Doc };
