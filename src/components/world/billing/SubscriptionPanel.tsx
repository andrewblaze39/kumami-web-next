'use client';
/**
 * Profile → Subscription (spec v1.13 Pro §21): status, plan, renewal / end date,
 * and Cancel / Resume / Update card (card) or Extend (crypto). All actions go
 * through /api/v1 — the browser never writes billing fields.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, fmtDate, v1, type SubscriptionSummaryDto } from '@/lib/billing/clientApi';
import { PLANS, formatUsd } from '@/lib/billing/plans';

const SOURCE_LABEL = { stripe: 'Card (Stripe)', crypto: 'Crypto (NOWPayments)', admin: 'Granted by Kumami' } as const;

export default function SubscriptionPanel() {
  const [s, setS] = useState<SubscriptionSummaryDto | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  const load = useCallback(() => {
    v1<SubscriptionSummaryDto>('/me/subscription').then((r) => { setS(r); setLoadErr(false); }).catch(() => setLoadErr(true));
  }, []);
  useEffect(load, [load]);

  /** Stripe applies the change instantly; our database follows via the webhook, so poll briefly. */
  const refreshUntil = useCallback(async (done: (r: SubscriptionSummaryDto) => boolean) => {
    for (let i = 0; i < 10; i++) {
      const r = await v1<SubscriptionSummaryDto>('/me/subscription').catch(() => null);
      if (r) setS(r);
      if (r && done(r)) return;
      await new Promise((res) => setTimeout(res, 1500));
    }
  }, []);

  const act = useCallback(async (kind: 'cancel' | 'resume' | 'card') => {
    if (kind === 'cancel' && !window.confirm(`Cancel your subscription? You keep Pro until ${fmtDate(s?.periodEnd ?? null)} and won’t be charged again.`)) return;
    setBusy(kind);
    setMsg(null);
    try {
      if (kind === 'card') {
        const r = await v1<{ url: string }>('/subscription/payment-method', { method: 'POST' });
        window.location.assign(r.url);
        return;
      }
      await v1(`/subscription/${kind}`, { method: 'POST' });
      await refreshUntil((r) => r.cancelAtPeriodEnd === (kind === 'cancel'));
      setMsg({ kind: 'ok', text: kind === 'cancel' ? 'Cancelled — Pro stays active until the end of the period.' : 'Your subscription will renew as normal.' });
    } catch (e) {
      setMsg({ kind: 'bad', text: e instanceof ApiError ? e.message : 'Something went wrong. Please try again.' });
    } finally {
      setBusy(null);
    }
  }, [s?.periodEnd, refreshUntil]);

  if (loadErr) return <div className="w-bill-alert bad">Couldn’t load your subscription. <button type="button" className="w-btn w-btn-ghost w-btn-sm" onClick={load}>Retry</button></div>;
  if (!s) return <div className="w-bill-note">Loading subscription…</div>;

  if (!s.isPro) {
    return (
      <div className="w-bill-card" data-testid="sub-none">
        <h2>No active subscription</h2>
        <p className="w-bill-note">
          {s.status === 'canceled' || s.status === 'expired' ? `Your Pro ended on ${fmtDate(s.periodEnd)}. ` : ''}
          Kumami Pro is {formatUsd(PLANS.monthly.priceCents)} a month or {formatUsd(PLANS.yearly.priceCents)} a year, by card or crypto.
        </p>
        <div className="w-bill-actions"><Link className="w-btn w-btn-primary" href="/world/subscribe">Get Kumami Pro</Link></div>
      </div>
    );
  }

  const statusText =
    s.status === 'past_due' ? 'Payment failed — retrying' :
    s.cancelAtPeriodEnd ? 'Cancelled — ends at period end' :
    'Active';

  return (
    <div className="w-bill-card" data-testid="sub-active">
      <h2>Kumami Pro</h2>
      {s.status === 'past_due' && (
        <div className="w-bill-alert warn" style={{ marginBottom: 12 }}>
          Your last renewal payment failed. Update your card to keep Pro — access continues for a few days while we retry.
        </div>
      )}
      {s.showRenewReminder && (
        <div className="w-bill-alert warn" style={{ marginBottom: 12 }} data-testid="renew-reminder">
          Your Pro ends on {fmtDate(s.periodEnd)}. Crypto plans don’t renew — <Link href="/world/subscribe">extend now</Link>.
        </div>
      )}
      <div className="w-bill-rows">
        <div className="w-bill-row"><span>Status</span><span data-testid="sub-status">{statusText}</span></div>
        <div className="w-bill-row"><span>Plan</span><span>{s.plan ? PLANS[s.plan].name : s.source === 'admin' ? 'Pro (granted)' : 'Pro'}</span></div>
        <div className="w-bill-row"><span>Paid with</span><span>{s.source ? SOURCE_LABEL[s.source] : '—'}</span></div>
        <div className="w-bill-row">
          <span>{s.source === 'stripe' && !s.cancelAtPeriodEnd && s.status !== 'past_due' ? 'Renews on' : 'Pro until'}</span>
          <span data-testid="sub-date">{s.periodEnd ? fmtDate(s.periodEnd) : 'No end date'}</span>
        </div>
      </div>
      {msg && <div className={`w-bill-alert ${msg.kind}`} style={{ marginTop: 12 }} role="status">{msg.text}</div>}
      <div className="w-bill-actions">
        {s.canCancel && <button type="button" className="w-btn w-btn-ghost" disabled={!!busy} onClick={() => act('cancel')} data-testid="sub-cancel">{busy === 'cancel' ? 'Cancelling…' : 'Cancel subscription'}</button>}
        {s.canResume && <button type="button" className="w-btn w-btn-primary" disabled={!!busy} onClick={() => act('resume')} data-testid="sub-resume">{busy === 'resume' ? 'Resuming…' : 'Resume subscription'}</button>}
        {s.canUpdateCard && <button type="button" className="w-btn w-btn-surface" disabled={!!busy} onClick={() => act('card')} data-testid="sub-card">{busy === 'card' ? 'Opening…' : 'Update card'}</button>}
        {s.source === 'crypto' && <Link className="w-btn w-btn-primary" href="/world/subscribe">Add more time</Link>}
      </div>
    </div>
  );
}
