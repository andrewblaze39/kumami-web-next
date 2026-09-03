import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Coming Soon — Kumami World',
  description: 'Kumami Pro subscription is coming soon.',
  robots: { index: false, follow: false },
};

// Pro brand accent (matches --pro in the Pro dashboard's ComingSoon panels).
const PRO = '#b9a4ff';
const PRO_SOFT = 'rgba(185, 164, 255, 0.16)';

/**
 * /world/subscribe — Pro subscription "coming soon" page inside the shell.
 * Mirrors the Pro dashboard's ComingSoon card (Sparkles badge + "Coming soon"
 * pill), so the Get-Kumami-Pro flow lands on the same branded placeholder.
 */
export default function WorldSubscribePage() {
  return (
    <div className="w-content-inner">
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border-2)',
            borderRadius: 20,
            padding: '52px 36px',
            textAlign: 'center',
            maxWidth: 560,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: PRO_SOFT,
              color: PRO,
            }}
          >
            <Sparkles size={28} />
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 12px',
              borderRadius: 999,
              background: PRO_SOFT,
              color: PRO,
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Coming soon
          </span>

          <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: 'var(--ink)' }}>
            Kumami Pro
          </h1>

          <p style={{ margin: 0, maxWidth: '46ch', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
            Real-time alpha, smart-money tracking and exclusive access — all in one place. We&apos;re
            putting the finishing touches on subscriptions; it lights up here the moment it&apos;s ready.
          </p>

          <Link href="/world/news" className="w-btn w-btn-surface w-btn-lg" style={{ marginTop: 6 }}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
