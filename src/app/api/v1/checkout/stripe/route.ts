/**
 * POST /api/v1/checkout/stripe  { plan: 'monthly'|'yearly', referralCode? }
 * → { url, orderId }: open `url` (Stripe-hosted checkout). Pro is granted only by
 * the webhook after payment. Errors: already_subscribed, invalid_referral_code,
 * invalid_plan, billing_not_configured (docs/API.md).
 */
import { randomUUID } from 'node:crypto';
import { baseUrl, fail, handler, ok, readJson, requireUser } from '@/lib/api/v1';
import { createOrder } from '@/lib/billing/checkout';
import { firestoreStore } from '@/lib/billing/firestoreStore';
import { isPlanId } from '@/lib/billing/plans';
import { stripe, stripePriceId } from '@/lib/billing/stripeClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler('checkout/stripe', async (req: Request) => {
  const caller = await requireUser(req);
  if (!('uid' in caller)) return caller;
  const body = await readJson(req);
  if (!isPlanId(body.plan)) return fail('invalid_plan', 400, 'plan must be "monthly" or "yearly".');
  const plan = body.plan;
  const priceId = stripePriceId(plan); // throws → 503 when not configured
  const s = stripe();
  const store = firestoreStore();

  const order = await createOrder(store, { uid: caller.uid, provider: 'stripe', plan, referralCode: body.referralCode },
    { now: new Date(), newId: randomUUID });
  if (!order.ok) {
    const e = order.error;
    return fail(e.code, e.status, e.code === 'invalid_referral_code' ? `Referral code ${e.reason.replace('_', ' ')}.` : undefined);
  }

  // One Stripe customer per user (idempotency key → concurrent first checkouts share one).
  let customerId = typeof order.user.stripeCustomerId === 'string' ? order.user.stripeCustomerId : null;
  if (!customerId) {
    const c = await s.customers.create(
      { email: caller.email ?? (order.user.email as string | undefined), metadata: { uid: caller.uid } },
      { idempotencyKey: `kumami-customer-${caller.uid}` },
    );
    customerId = c.id;
    await store.runTransaction(async (tx) => tx.set(`users/${caller.uid}`, { stripeCustomerId: customerId }, { merge: true }));
  }

  const base = baseUrl(req);
  const metadata = { uid: caller.uid, plan, orderId: order.orderId };
  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: caller.uid,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata,
    subscription_data: { metadata },
    success_url: `${base}/world/subscribe/success?order=${order.orderId}`,
    cancel_url: `${base}/world/subscribe?cancelled=1`,
  }, { idempotencyKey: `kumami-checkout-${order.orderId}` });

  await store.runTransaction(async (tx) => tx.set(`checkout_orders/${order.orderId}`, { stripeSessionId: session.id }, { merge: true }));
  if (!session.url) return fail('provider_error', 502, 'Stripe did not return a checkout URL.');
  return ok({ url: session.url, orderId: order.orderId });
});
