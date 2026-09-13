'use client';

/**
 * GatedArticleBody — real content gating for premium/Pro article bodies.
 *
 * The parent page is a Server Component (for SEO metadata), so it can't know
 * the viewer's tier. This client wrapper reads useAuth() and only renders the
 * full body for premium viewers — non-premium viewers (including logged-out
 * ones) get a blurred preview + upgrade CTA. Fixes a real content leak: the
 * blogs/research detail pages previously rendered the full body regardless of
 * the "Premium" badge shown above it.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface GatedArticleBodyProps {
  locked: boolean;
  gateLabel: string;
  gateHref?: string;
  children: ReactNode;
}

export default function GatedArticleBody({
  locked,
  gateLabel,
  gateHref = '/world/pro',
  children,
}: GatedArticleBodyProps) {
  const { userData } = useAuth();

  if (!locked || userData?.isPremium) {
    return <>{children}</>;
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          filter: 'blur(4px)',
          pointerEvents: 'none',
          userSelect: 'none',
          maxHeight: '180px',
          overflow: 'hidden',
          opacity: 0.5,
        }}
        aria-hidden="true"
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,15,0.92) 40%)',
          borderRadius: '12px',
          gap: '12px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontWeight: 800, fontSize: '18px', color: 'var(--gold)' }}>
          {gateLabel}
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
          Upgrade to read the full story.
        </p>
        <Link
          href={gateHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '10px 20px',
            borderRadius: '999px',
            background: 'var(--gold)',
            color: '#06241a',
            fontWeight: 800,
            fontSize: '13px',
            textDecoration: 'none',
          }}
        >
          Upgrade to PRO
        </Link>
      </div>
    </div>
  );
}
