/**
 * POST /api/v1/checkout/crypto  { plan: 'monthly'|'yearly', referralCode? }
 * → { invoiceUrl, orderId }: open `invoiceUrl` (NOWPayments invoice). Prepaid:
 * 30 / 365 days, stacks on crypto time left. Pro only after the verified IPN.
 */
import { randomUUID } from 'node:crypto';
import { baseUrl, fail, handler, ok, readJson, requireUser } from '@/lib/api/v1';
import { createOrder } from '@/lib/billing/checkout';
import { firestoreStore } from '@/lib/billing/firestoreStore';
import { createInvoice } from '@/lib/billing/nowpayments';
import { PLANS, isPlanId } from '@/lib/billing/plans';
import { BillingNotConfigured } from '@/lib/billing/stripeClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler('checkout/crypto', async (req: Request) => {
  const caller = await requireUser(req);
  if (!('uid' in caller)) return caller;
  const body = await readJson(req);
  if (!isPlanId(body.plan)) return fail('invalid_plan', 400, 'plan must be "monthly" or "yearly".');
  const plan = body.plan;
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey || !process.env.NOWPAYMENTS_IPN_SECRET) throw new BillingNotConfigured('NOWPAYMENTS_API_KEY / NOWPAYMENTS_IPN_SECRET');
  const store = firestoreStore();

  const order = await createOrder(store, { uid: caller.uid, provider: 'crypto', plan, referralCode: body.referralCode },
    { now: new Date(), newId: randomUUID });
  if (!order.ok) {
    const e = order.error;
    return fail(e.code, e.status, e.code === 'invalid_referral_code' ? `Referral code ${e.reason.replace('_', ' ')}.` : undefined);
  }

  const base = baseUrl(req);
  let invoice;
  try {
    invoice = await createInvoice(
      { apiBase: process.env.NOWPAYMENTS_API_BASE || 'https://api.nowpayments.io/v1', apiKey },
      {
        orderId: order.orderId,
        priceUsd: PLANS[plan].priceCents / 100,
        description: `Kumami Pro — ${PLANS[plan].name} (${PLANS[plan].days} days)`,
        ipnUrl: `${base}/api/v1/webhooks/nowpayments`,
        successUrl: `${base}/world/subscribe/success?order=${order.orderId}`,
        cancelUrl: `${base}/world/subscribe?cancelled=1`,
      },
    );
  } catch (e) {
    console.error('[api/v1 checkout/crypto] invoice', e);
    await store.runTransaction(async (tx) => tx.set(`checkout_orders/${order.orderId}`, { status: 'failed', failReason: 'invoice_create' }, { merge: true }));
    return fail('provider_error', 502, 'Could not create the crypto invoice. Please try again.');
  }
  await store.runTransaction(async (tx) =>
    tx.set(`checkout_orders/${order.orderId}`, { providerRef: invoice.id, invoiceUrl: invoice.invoiceUrl }, { merge: true }));
  return ok({ invoiceUrl: invoice.invoiceUrl, orderId: order.orderId });
});
