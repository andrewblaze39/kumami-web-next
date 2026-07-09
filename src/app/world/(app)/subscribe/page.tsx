import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Coming Soon — Kumami World',
  description: 'Kumami Pro subscription is coming soon.',
  robots: { index: false, follow: false },
};

/** /world/subscribe — Pro subscription "coming soon" page inside the shell. */
export default function WorldSubscribePage() {
  return (
    <div className="w-content-inner">
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border-2)',
            borderRadius: 18,
            padding: '48px 32px',
            textAlign: 'center',
            maxWidth: 560,
            width: '100%',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              background: 'linear-gradient(135deg, #96EDD6, #40e0d0)',
            }}
          >
            🐻
          </div>
          <h1
            style={{
              margin: '0 0 12px',
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 800,
              color: 'var(--accent)',
            }}
          >
            Coming Soon
          </h1>
          <p style={{ margin: '0 0 28px', color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
            Kumami Pro is almost here. We&apos;re putting the finishing touches on something
            great. Stay tuned!
          </p>
          <Link href="/world/news" className="w-btn w-btn-primary w-btn-lg">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
