'use client';
/**
 * Crypto Pro doesn't renew: from 7 days before it ends, show a small "extend"
 * banner at the top of the shell (in-app only; email reminders are on the
 * roadmap). Dismissed per browser per day. Spec v1.13 Pro §21.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { v1, type SubscriptionSummaryDto } from '@/lib/billing/clientApi';

const KEY = 'kumami_renew_banner_dismissed';

export default function RenewBanner() {
  const { currentUser, userData } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser || !userData?.isPremium) return;
    try {
      if (localStorage.getItem(KEY) === new Date().toDateString()) return;
    } catch { /* ignore */ }
    v1<SubscriptionSummaryDto>('/me/subscription')
      .then((s) => setDaysLeft(s.showRenewReminder && s.periodEnd
        ? Math.max(0, Math.ceil((Date.parse(s.periodEnd) - Date.now()) / 86_400_000))
        : null))
      .catch(() => undefined);
  }, [currentUser, userData?.isPremium]);

  if (daysLeft === null) return null;
  const days = daysLeft;
  const dismiss = () => {
    try { localStorage.setItem(KEY, new Date().toDateString()); } catch { /* ignore */ }
    setDaysLeft(null);
  };
  return (
    <div className="w-renew-banner" role="status" data-testid="renew-banner">
      <span>Your Kumami Pro ends {days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`} — crypto plans don’t renew automatically.</span>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link className="w-btn w-btn-primary w-btn-sm" href="/world/subscribe">Extend</Link>
        <button type="button" className="w-renew-x" aria-label="Dismiss" onClick={dismiss}>×</button>
      </span>
    </div>
  );
}
