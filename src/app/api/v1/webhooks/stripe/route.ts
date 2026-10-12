/**
 * POST /api/v1/webhooks/stripe — Stripe → Kumami. Signature checked on the RAW
 * body (STRIPE_WEBHOOK_SECRET). 200 = processed or safely ignored; 400 = bad
 * signature; 500 = transient failure → Stripe retries (events are idempotent).
 * Subscribe the endpoint to: checkout.session.completed, invoice.paid,
 * invoice.payment_failed, customer.subscription.created/updated/deleted,
 * charge.refunded, charge.dispute.created.
 */
import Stripe from 'stripe';
import { fail, ok } from '@/lib/api/v1';
import { firestoreStore } from '@/lib/billing/firestoreStore';
import { stripe, stripeDeps } from '@/lib/billing/stripeClient';
import { handleStripeEvent } from '@/lib/billing/stripeWebhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhooks/stripe] STRIPE_WEBHOOK_SECRET missing');
    return fail('billing_not_configured', 503);
  }
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return fail('bad_signature', 400);
  }
  try {
    const r = await handleStripeEvent(event as unknown as Parameters<typeof handleStripeEvent>[0], stripeDeps(firestoreStore()));
    console.info(`[webhooks/stripe] ${event.type} ${event.id} → ${r.status}${r.detail ? ` (${r.detail})` : ''}`);
    return ok({ received: true, ...r });
  } catch (e) {
    console.error(`[webhooks/stripe] ${event.type} ${event.id} failed`, e);
    return fail('processing_failed', 500);
  }
}
