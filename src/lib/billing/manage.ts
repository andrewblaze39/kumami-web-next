import 'server-only';
import { fail } from '@/lib/api/v1';
import { firestoreStore } from './firestoreStore';
import type { Doc } from './store';

/** The caller's live Stripe subscription id, or a 409 response when there is none. */
export async function liveStripeSubscription(uid: string): Promise<{ subId: string; user: Doc } | Response> {
  const user = await firestoreStore().get(`users/${uid}`);
  const subId = typeof user?.stripeSubscriptionId === 'string' ? user.stripeSubscriptionId : null;
  const live = user?.proSource === 'stripe' && ['active', 'past_due', 'canceling'].includes(String(user?.subscriptionStatus));
  if (!user || !subId || !live) return fail('no_card_subscription', 409, 'You have no active card subscription.');
  return { subId, user };
}
