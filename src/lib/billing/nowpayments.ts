/**
 * NOWPayments (crypto) — spec v1.13 Pro §21. Crypto is prepaid: a "finished"
 * payment adds the plan's days on top of any crypto time left; nothing renews.
 *
 * IPN signature (NOWPayments docs): HMAC-SHA512 of JSON.stringify(body with its
 * keys sorted at every level), keyed by the IPN secret, hex — compared to the
 * `x-nowpayments-sig` header in constant time. The old Firebase Function never
 * checked it; here an unsigned or tampered IPN is rejected before anything runs.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { toMillis } from '@/lib/pro';
import { cryptoProUntil } from './entitlement';
import { PLANS, isPlanId } from './plans';
import { applyReferralReward, reverseReferralReward } from './referral';
import { safeId, type Doc, type Store, type Tx } from './store';

export function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) out[k] = sortDeep((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}

export function signIpn(body: unknown, secret: string): string {
  return createHmac('sha512', secret).update(JSON.stringify(sortDeep(body))).digest('hex');
}

export function verifyIpn(body: unknown, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(signIpn(body, secret), 'utf8');
  const got = Buffer.from(signature.trim().toLowerCase(), 'utf8');
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export interface NowPaymentsConfig {
  apiBase: string; // https://api.nowpayments.io/v1 | https://api-sandbox.nowpayments.io/v1
  apiKey: string;
}

export async function createInvoice(
  cfg: NowPaymentsConfig,
  p: { orderId: string; priceUsd: number; description: string; ipnUrl: string; successUrl: string; cancelUrl: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string; invoiceUrl: string }> {
  const res = await fetchImpl(`${cfg.apiBase}/invoice`, {
    method: 'POST',
    headers: { 'x-api-key': cfg.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      price_amount: p.priceUsd,
      price_currency: 'usd',
      order_id: p.orderId,
      order_description: p.description,
      ipn_callback_url: p.ipnUrl,
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      is_fee_paid_by_user: true,
    }),
  });
  const data = (await res.json().catch(() => null)) as { id?: unknown; invoice_url?: unknown } | null;
  if (!res.ok || !data?.id || typeof data.invoice_url !== 'string') {
    throw new Error(`NOWPayments invoice failed (${res.status})`);
  }
  return { id: String(data.id), invoiceUrl: data.invoice_url };
}

export type IpnResult = { status: 'applied' | 'duplicate' | 'ignored'; detail: string };

/** Apply a VERIFIED IPN body. */
export async function handleIpn(body: Record<string, unknown>, deps: { store: Store; now: () => Date }): Promise<IpnResult> {
  const now = deps.now();
  const paymentId = body.payment_id != null ? String(body.payment_id) : '';
  const status = typeof body.payment_status === 'string' ? body.payment_status : '';
  const orderId = typeof body.order_id === 'string' ? body.order_id : '';
  if (!paymentId || !status || !orderId) return { status: 'ignored', detail: 'missing_fields' };

  const eventPath = `webhook_events/np_${safeId(paymentId)}_${safeId(status)}`;
  return deps.store.runTransaction(async (tx) => {
    if (await tx.get(eventPath)) return { status: 'duplicate', detail: status };
    const detail = await apply(tx, { body, status, paymentId, orderId, now });
    tx.set(eventPath, { provider: 'nowpayments', type: status, orderId, paymentId, result: detail, processedAt: now });
    return { status: 'applied', detail };
  });
}

async function apply(
  tx: Tx,
  p: { body: Record<string, unknown>; status: string; paymentId: string; orderId: string; now: Date },
): Promise<string> {
  const orderPath = `checkout_orders/${safeId(p.orderId)}`;
  const order = await tx.get(orderPath);
  if (!order || order.provider !== 'crypto') return 'unknown_order';
  const uid = String(order.userId);
  const plan = isPlanId(order.plan) ? order.plan : null;
  if (!plan) return 'unknown_plan';
  const payPath = `payments/np_${safeId(p.paymentId)}`;
  const progress = { lastStatus: p.status, lastStatusAt: p.now, nowPaymentsPaymentId: p.paymentId };

  switch (p.status) {
    case 'finished': {
      if (order.status === 'paid') return 'already_paid';
      const paidCents = Math.round(Number(p.body.price_amount) * 100);
      const currency = String(p.body.price_currency ?? '').toLowerCase();
      if (paidCents !== order.amountCents || currency !== 'usd') {
        tx.set(orderPath, { ...progress, status: 'review', reviewReason: 'amount_mismatch' }, { merge: true });
        return 'amount_mismatch';
      }
      const user = await tx.get(`users/${uid}`);
      if (!user) return 'user_not_found';
      const isFirstPayment = !user.firstPaidAt;
      const until = cryptoProUntil(
        { isPremium: user.isPremium, proUntil: toMillis(user.proUntil as Date), proSource: user.proSource },
        PLANS[plan].days, p.now.getTime(),
      );
      const paymentId = `np_${safeId(p.paymentId)}`;
      const referral = await applyReferralReward(tx, {
        payerUid: uid, code: order.referralCode ?? null, plan, paymentId, isFirstPayment, now: p.now,
      });
      tx.set(payPath, {
        userId: uid, provider: 'crypto', plan, amountCents: paidCents, currency: 'usd',
        payCurrency: str(p.body.pay_currency), actuallyPaid: p.body.actually_paid ?? null,
        periodStart: p.now, periodEnd: until, orderId: p.orderId, isFirstPayment, status: 'paid',
        nowPaymentsPaymentId: p.paymentId, nowPaymentsInvoiceId: p.body.invoice_id != null ? String(p.body.invoice_id) : null,
        referralRewardId: referral.applied ? referral.rewardId : null,
        referralResult: referral.applied ? 'credited' : referral.reason,
        createdAt: p.now,
      });
      tx.set(`users/${uid}`, {
        isPremium: true, proUntil: until, proSource: 'crypto', plan, subscriptionStatus: 'active', cancelAtPeriodEnd: false,
        ...(isFirstPayment ? { firstPaidAt: p.now } : {}),
      }, { merge: true });
      tx.set(`subscriptions/crypto_${safeId(p.orderId)}`, {
        userId: uid, provider: 'crypto', plan, status: 'paid', currentPeriodStart: p.now, currentPeriodEnd: until, updatedAt: p.now,
      });
      tx.set(orderPath, { ...progress, status: 'paid', paidAt: p.now, paymentId }, { merge: true });
      return referral.applied ? 'paid+referral' : 'paid';
    }
    case 'partially_paid':
      if (order.status === 'paid') return 'ignored_after_paid';
      tx.set(orderPath, { ...progress, status: 'partially_paid', actuallyPaid: p.body.actually_paid ?? null }, { merge: true });
      return 'partially_paid';
    case 'failed':
    case 'expired':
      if (order.status === 'paid') return 'ignored_after_paid';
      tx.set(orderPath, { ...progress, status: p.status }, { merge: true });
      return p.status;
    case 'refunded': {
      const payment = await tx.get(payPath);
      if (!payment || payment.status !== 'paid') return 'refund_without_payment';
      tx.set(payPath, { status: 'refunded', refundedAt: p.now }, { merge: true });
      tx.set(orderPath, { ...progress, status: 'refunded' }, { merge: true });
      const reversed = await reverseReferralReward(tx, { payerUid: uid, paymentId: `np_${safeId(p.paymentId)}`, now: p.now, reason: 'refund' });
      // Take back the days this payment added.
      const user = (await tx.get(`users/${uid}`)) ?? {};
      if (user.proSource === 'crypto') {
        const until = (toMillis(user.proUntil as Date) ?? p.now.getTime()) - PLANS[plan].days * 86_400_000;
        tx.set(`users/${uid}`, until > p.now.getTime()
          ? { proUntil: new Date(until) }
          : { isPremium: false, proUntil: p.now, subscriptionStatus: 'canceled' }, { merge: true });
      }
      return reversed ? 'refunded+referral_reversed' : 'refunded';
    }
    default:
      if (order.status !== 'paid') tx.set(orderPath, progress, { merge: true });
      return `progress:${p.status}`;
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

export type { Doc };
