'use client';
/**
 * /world/subscribe/success?order=… — Stripe / NOWPayments send the user here.
 * Polls GET /api/v1/checkout/{orderId} until the webhook has marked it paid.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, fmtDate, v1, type SubscriptionSummaryDto } from '@/lib/billing/clientApi';

interface OrderDto {
  provider: 'stripe' | 'crypto';
  status: string;
  lastStatus: string | null;
  subscription: SubscriptionSummaryDto;
}

const POLL_MS = 3000;
const GIVE_UP_MS = 5 * 60_000;

export default function SubscribeSuccess() {
  const orderId = useSearchParams().get('order');
  const { currentUser } = useAuth();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!orderId || !currentUser) return;
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      try {
        const o = await v1<OrderDto>(`/checkout/${encodeURIComponent(orderId)}`);
        if (stop) return;
        setOrder(o);
        if (o.status === 'paid' || ['failed', 'expired', 'review', 'partially_paid', 'refunded'].includes(o.status)) return;
      } catch (e) {
        if (stop) return;
        if (e instanceof ApiError && e.status === 404) { setError('We couldn’t find this order.'); return; }
      }
      if (Date.now() - started > GIVE_UP_MS) { setTimedOut(true); return; }
      setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => { stop = true; };
  }, [orderId, currentUser]);

  const paid = order?.status === 'paid';
  const s = order?.subscription;

  return (
    <div className="w-content-inner">
      <div className="w-bill" style={{ maxWidth: 560, textAlign: 'center', paddingTop: 48 }}>
        {!orderId || error ? (
          <div className="w-bill-alert bad">{error ?? 'No order to show.'} <Link href="/world/subscribe">Back to plans</Link></div>
        ) : paid ? (
          <div className="w-bill-card" data-testid="success-paid">
            <CheckCircle2 style={{ width: 48, height: 48, color: 'var(--bull)', margin: '0 auto 10px' }} />
            <h1 style={{ fontSize: 24 }}>You’re Pro!</h1>
            <p className="w-bill-sub">
              {s?.source === 'stripe' ? `Your ${s.plan} plan renews on ${fmtDate(s.periodEnd)}.` : `Pro is active until ${fmtDate(s?.periodEnd ?? null)}.`}
            </p>
            <div className="w-bill-actions" style={{ justifyContent: 'center' }}>
              {/* Full page load (not <Link>): AuthContext reads Pro status once per load. */}
              <a className="w-btn w-btn-primary" href="/world/pro">Open Kumami Pro</a>
              <Link className="w-btn w-btn-ghost" href="/world/profile?tab=subscription">Subscription details</Link>
            </div>
          </div>
        ) : order && ['failed', 'expired'].includes(order.status) ? (
          <div className="w-bill-alert bad">This payment {order.status === 'expired' ? 'expired' : 'failed'} — you weren’t charged. <Link href="/world/subscribe">Try again</Link></div>
        ) : order && ['partially_paid', 'review'].includes(order.status) ? (
          <div className="w-bill-alert warn">
            We received {order.status === 'partially_paid' ? 'only part of' : 'a payment that doesn’t match'} the amount, so Pro isn’t active yet.
            Our team will review it — contact support with order <code>{orderId}</code>.
          </div>
        ) : (
          <div className="w-bill-card" data-testid="success-pending">
            <Loader2 className="animate-spin" style={{ width: 40, height: 40, color: 'var(--accent)', margin: '0 auto 10px' }} />
            <h1 style={{ fontSize: 22 }}>Activating Pro…</h1>
            <p className="w-bill-sub">
              {order?.provider === 'crypto'
                ? 'Waiting for the crypto payment to be confirmed on-chain — this can take a few minutes. You can leave this page; Pro switches on automatically.'
                : 'Confirming your payment with Stripe — usually a few seconds.'}
            </p>
            {timedOut && <p className="w-bill-note">Still confirming. Check Profile → Subscription in a little while.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
