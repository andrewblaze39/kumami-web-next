'use client';
/**
 * Profile → Referrals (spec v1.13 Pro §22): the user's code + share link, how
 * many friends have paid, the referral balance and its history. Withdrawals
 * are not available yet (roadmap) — the balance is tracked only.
 */
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { ApiError, fmtDate, v1, type ReferralDto } from '@/lib/billing/clientApi';
import { formatUsd } from '@/lib/billing/plans';

const TYPE_LABEL: Record<string, string> = {
  referral_referrer: 'A friend subscribed with your code',
  referral_referee: 'You subscribed with a friend’s code',
  reversal: 'Reversed — payment refunded',
};

export default function ReferralPanel() {
  const [r, setR] = useState<ReferralDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const load = useCallback(() => {
    v1<ReferralDto>('/referral/me')
      .then((d) => { setR(d); setErr(null); })
      .catch((e) => setErr(e instanceof ApiError ? e.message : 'Couldn’t load referrals.'));
  }, []);
  useEffect(load, [load]);

  const copy = (text: string, what: 'code' | 'link') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => undefined);
  };

  if (err) return <div className="w-bill-alert bad">{err} <button type="button" className="w-btn w-btn-ghost w-btn-sm" onClick={load}>Retry</button></div>;
  if (!r) return <div className="w-bill-note">Loading referrals…</div>;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="w-bill-card">
        <h2>Your referral code</h2>
        <div className="w-bill-field" style={{ justifyContent: 'space-between' }}>
          <span className="w-bill-code" data-testid="ref-code">{r.code}</span>
          <button type="button" className="w-btn w-btn-ghost w-btn-sm" onClick={() => copy(r.code, 'code')} aria-label="Copy referral code">
            {copied === 'code' ? <Check /> : <Copy />} {copied === 'code' ? 'Copied' : 'Copy code'}
          </button>
        </div>
        <div className="w-bill-field" style={{ marginTop: 12 }}>
          <input className="w-bill-input" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13.5 }} readOnly value={r.links.web} aria-label="Referral link" data-testid="ref-link" />
          <button type="button" className="w-btn w-btn-primary w-btn-sm" onClick={() => copy(r.links.web, 'link')} aria-label="Copy referral link">
            {copied === 'link' ? <Check /> : <Copy />} {copied === 'link' ? 'Copied' : 'Copy link'}
          </button>
        </div>
        <p className="w-bill-note" style={{ marginTop: 12 }}>
          When a friend pays for Pro with your code, you each get {formatUsd(r.rewards.monthly ?? 0)} (Monthly plan) or {formatUsd(r.rewards.yearly ?? 0)} (Yearly plan) —
          once per friend, on their first payment. No limit on how many friends you invite.
        </p>
      </div>

      <div className="w-bill-stats">
        <div className="w-bill-stat"><b data-testid="ref-count">{r.referralCount}</b><span>Friends who subscribed</span></div>
        <div className="w-bill-stat"><b data-testid="ref-balance">{formatUsd(r.balanceCents)}</b><span>Referral balance</span></div>
      </div>
      <div className="w-bill-alert" style={{ fontSize: 13 }}>Withdrawals are coming soon — your balance is saved and will be available to withdraw then.</div>

      <div className="w-bill-card">
        <h2>History</h2>
        {r.ledger.length === 0 ? (
          <p className="w-bill-note">No referral credits yet.</p>
        ) : (
          <ul className="w-bill-ledger" data-testid="ref-ledger">
            {r.ledger.map((e) => (
              <li key={e.id}>
                <span>{TYPE_LABEL[e.type] ?? e.type} · {fmtDate(e.createdAt)}</span>
                <b className={e.amountCents >= 0 ? 'pos' : 'neg'}>{e.amountCents >= 0 ? '+' : ''}{formatUsd(e.amountCents)}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
