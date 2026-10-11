/** POST /api/v1/subscription/resume — undo a cancel before the period ends (card only). */
import { NextResponse } from 'next/server';
import { handler, ok, requireUser } from '@/lib/api/v1';
import { liveStripeSubscription } from '@/lib/billing/manage';
import { stripe } from '@/lib/billing/stripeClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler('subscription/resume', async (req: Request) => {
  const caller = await requireUser(req);
  if (!('uid' in caller)) return caller;
  const live = await liveStripeSubscription(caller.uid);
  if (live instanceof Response) return live as NextResponse;
  const sub = await stripe().subscriptions.update(live.subId, { cancel_at_period_end: false });
  return ok({ cancelAtPeriodEnd: sub.cancel_at_period_end });
});
