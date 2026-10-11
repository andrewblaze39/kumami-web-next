/**
 * What GET /api/v1/me/subscription returns — the user's Pro status in a shape
 * the website and the Flutter app render directly. Pure; unit-tested.
 */
import { isProActive, toMillis } from '@/lib/pro';
import { CRYPTO_REMINDER_MS, isPlanId, type PlanId } from './plans';
import type { Doc } from './store';

export interface SubscriptionSummary {
  isPro: boolean;
  /** stripe = card, crypto = NOWPayments, admin = granted by Kumami; null = never subscribed. */
  source: 'stripe' | 'crypto' | 'admin' | null;
  plan: PlanId | null;
  status: string | null;
  /** When Pro ends (ISO) — for card: renewal/end date incl. grace; null = no end date (admin). */
  proUntil: string | null;
  cancelAtPeriodEnd: boolean;
  /** Card: cancel / resume / update card are available. */
  canCancel: boolean;
  canResume: boolean;
  canUpdateCard: boolean;
  /** Crypto Pro ending within 7 days → show the "extend" reminder. */
  showRenewReminder: boolean;
}

export function subscriptionSummary(user: Doc | null, nowMs: number): SubscriptionSummary {
  const u = user ?? {};
  const until = toMillis(u.proUntil as Date);
  const isPro = isProActive({ isPremium: u.isPremium, proUntil: until }, nowMs);
  const source = u.proSource === 'stripe' || u.proSource === 'crypto' || u.proSource === 'admin' ? u.proSource : null;
  const status = typeof u.subscriptionStatus === 'string' ? u.subscriptionStatus : null;
  const cancelAtPeriodEnd = u.cancelAtPeriodEnd === true;
  const stripeLive = source === 'stripe' && !!u.stripeSubscriptionId && ['active', 'past_due', 'canceling'].includes(status ?? '');
  return {
    isPro,
    source,
    plan: isPlanId(u.plan) ? u.plan : null,
    status,
    proUntil: until !== null ? new Date(until).toISOString() : null,
    cancelAtPeriodEnd,
    canCancel: isPro && stripeLive && !cancelAtPeriodEnd,
    canResume: isPro && stripeLive && cancelAtPeriodEnd,
    canUpdateCard: stripeLive,
    showRenewReminder: isPro && source === 'crypto' && until !== null && until - nowMs <= CRYPTO_REMINDER_MS,
  };
}
