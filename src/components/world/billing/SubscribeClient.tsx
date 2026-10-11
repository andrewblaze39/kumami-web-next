'use client';
/**
 * /world/subscribe — choose a plan, optional referral code, pay by card (Stripe)
 * or crypto (NOWPayments). Spec v1.13 Pro §21–22. Pro is granted by the
 * payment webhook, never by this page.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Bitcoin, Loader2 } from 'lucide-react';
import { PLANS, PLAN_IDS, formatUsd, type PlanId } from '@/lib/billing/plans';
import { ApiError, fmtDate, v1, type SubscriptionSummaryDto } from '@/lib/billing/clientApi';

type CodeState = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'bad'; text: string };

const CODE_MSG: Record<string, string> = {
  not_found: 'That code doesn’t exist — check the spelling.',
  own_code: 'That’s your own code — share it with friends instead.',
  malformed: 'Codes are 8 letters/numbers, e.g. KQ7MZ3PA.',
};

const ERR_MSG: Record<string, string> = {
  already_subscribed: 'You already have Kumami Pro — manage it in Profile → Subscription.',
  billing_not_configured: 'Payments aren’t switched on yet. Please try again later.',
  provider_error: 'The payment provider didn’t respond. Please try again.',
};

export default function SubscribeClient() {
  const params = useSearchParams();
  const [plan, setPlan] = useState<PlanId>('yearly');
  // ?ref= from a referral link — WorldProtected keeps it through sign-up / log-in.
  const [code, setCode] = useState(() => (params.get('ref') ?? '').toUpperCase().slice(0, 12));
  const [check, setCheck] = useState<{ code: string; state: CodeState } | null>(null);
  const [sub, setSub] = useState<SubscriptionSummaryDto | null>(null);
  const [busy, setBusy] = useState<'card' | 'crypto' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    v1<SubscriptionSummaryDto>('/me/subscription').then(setSub).catch(() => setSub(null));
  }, []);

  // Live code check (debounced). State only changes in the timer callback.
  useEffect(() => {
    const c = code.trim();
    if (!c) return;
    const t = setTimeout(() => {
      v1<{ valid: boolean; reason: string | null }>(`/referral/validate?code=${encodeURIComponent(c)}`)
        .then((r) => setCheck({ code: c, state: r.valid ? { kind: 'ok' } : { kind: 'bad', text: CODE_MSG[r.reason ?? ''] ?? 'Invalid code.' } }))
        .catch((e) => setCheck({ code: c, state: { kind: 'bad', text: e instanceof ApiError && e.code === 'rate_limited' ? e.message : 'Couldn’t check the code right now.' } }));
    }, 400);
    return () => clearTimeout(t);
  }, [code]);
  const codeState: CodeState = !code.trim() ? { kind: 'idle' } : check?.code === code.trim() ? check.state : { kind: 'checking' };

  const pay = useCallback(async (method: 'card' | 'crypto') => {
    setError(null);
    setBusy(method);
    try {
      const body = { plan, referralCode: codeState.kind === 'ok' ? code.trim() : undefined };
      if (method === 'card') {
        const r = await v1<{ url: string }>('/checkout/stripe', { method: 'POST', body });
        window.location.assign(r.url);
      } else {
        const r = await v1<{ invoiceUrl: string }>('/checkout/crypto', { method: 'POST', body });
        window.location.assign(r.invoiceUrl);
      }
    } catch (e) {
      setError(e instanceof ApiError ? ERR_MSG[e.code] ?? e.message : 'Something went wrong. Please try again.');
      setBusy(null);
    }
  }, [plan, code, codeState.kind]);

  const yearlySaving = useMemo(() => {
    const twelve = PLANS.monthly.priceCents * 12;
    return Math.round(((twelve - PLANS.yearly.priceCents) / twelve) * 100);
  }, []);

  const cardBlocked = !!sub?.isPro;
  const cryptoBlocked = !!sub?.isPro && sub.source !== 'crypto';
  const codeBlocking = codeState.kind === 'bad' || codeState.kind === 'checking';

  return (
    <div className="w-content-inner">
      <div className="w-bill">
        <div>
          <h1>Get Kumami Pro</h1>
          <p className="w-bill-sub">Real-time tools, Pro research, alpha and Kuma AI — everything in Kumami.</p>
        </div>

        {params.get('cancelled') && <div className="w-bill-alert warn">Checkout cancelled — you weren’t charged.</div>}

        {sub?.isPro && (
          <div className="w-bill-alert ok" data-testid="already-pro">
            You have Kumami Pro{sub.periodEnd ? ` until ${fmtDate(sub.periodEnd)}` : ''}
            {sub.source === 'stripe' ? ' (card)' : sub.source === 'crypto' ? ' (crypto)' : sub.source === 'admin' ? ' (granted by Kumami)' : ''}.{' '}
            {sub.source === 'crypto' ? 'You can add more time with crypto below. ' : ''}
            <Link href="/world/profile?tab=subscription">Manage subscription</Link>
          </div>
        )}

        <div className="w-bill-plans" role="group" aria-label="Plan">
          {PLAN_IDS.map((id) => {
            const p = PLANS[id];
            return (
              <button key={id} type="button" className="w-bill-plan" aria-pressed={plan === id} onClick={() => setPlan(id)} data-testid={`plan-${id}`}>
                {id === 'yearly' && <span className="w-bill-badge">SAVE {yearlySaving}%</span>}
                <div style={{ fontWeight: 800, fontSize: 17 }}>{p.name}</div>
                <div className="w-bill-price">{formatUsd(p.priceCents)}<span className="w-bill-per"> / {id === 'monthly' ? 'month' : 'year'}</span></div>
                <ul>
                  <li>Card: renews every {id === 'monthly' ? 'month' : 'year'} — cancel anytime</li>
                  <li>Crypto: one payment = {p.days} days of Pro</li>
                </ul>
              </button>
            );
          })}
        </div>

        <div className="w-bill-card">
          <h2>Referral code <span style={{ color: 'var(--muted)', fontWeight: 600 }}>(optional)</span></h2>
          <div className="w-bill-field">
            <input
              className="w-bill-input"
              aria-label="Referral code"
              placeholder="e.g. KQ7MZ3PA"
              value={code}
              maxLength={12}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              data-testid="referral-input"
            />
            {code && <button type="button" className="w-btn w-btn-ghost w-btn-sm" onClick={() => setCode('')}>Clear</button>}
          </div>
          <div className={`w-bill-hint${codeState.kind === 'ok' ? ' ok' : codeState.kind === 'bad' ? ' bad' : ''}`} data-testid="referral-hint" aria-live="polite">
            {codeState.kind === 'checking' && 'Checking…'}
            {codeState.kind === 'ok' && `Code applied — you and your friend each get ${formatUsd(PLANS[plan].referralRewardCents)} when you pay.`}
            {codeState.kind === 'bad' && codeState.text}
            {codeState.kind === 'idle' && 'Got a code from a friend? You both get a referral credit on your first payment.'}
          </div>
        </div>

        {error && <div className="w-bill-alert bad" role="alert">{error}</div>}

        <div className="w-bill-pay">
          <button type="button" className="w-btn w-btn-primary w-btn-lg" disabled={!!busy || cardBlocked || codeBlocking} onClick={() => pay('card')} data-testid="pay-card">
            {busy === 'card' ? <Loader2 className="animate-spin" /> : <CreditCard />} Pay {formatUsd(PLANS[plan].priceCents)} with card
          </button>
          <button type="button" className="w-btn w-btn-surface w-btn-lg" disabled={!!busy || cryptoBlocked || codeBlocking} onClick={() => pay('crypto')} data-testid="pay-crypto">
            {busy === 'crypto' ? <Loader2 className="animate-spin" /> : <Bitcoin />} Pay {formatUsd(PLANS[plan].priceCents)} with crypto
          </button>
        </div>
        <p className="w-bill-note">
          Card payments are handled by Stripe and renew automatically until you cancel in Profile → Subscription.
          Crypto payments are handled by NOWPayments: a one-time payment for {PLANS[plan].days} days that does not renew —
          Pro switches on once the payment is confirmed on-chain (usually a few minutes). Prices in USD.
        </p>
      </div>
    </div>
  );
}
