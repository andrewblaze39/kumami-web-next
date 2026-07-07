'use client';

/**
 * ProGate — list-level visual gating for PRO articles.
 *
 * Free users (userData?.isPremium falsy) see the wrapped row/hero dimmed
 * with a lock veil that links to /world/pro. Premium users see the child
 * normally. Article CONTENT protection happens on the detail page — this
 * is presentation only.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProGateProps {
  /** Whether the wrapped article is PRO-gated (isPro || isPremium on the doc) */
  locked?: boolean;
  children: ReactNode;
}

export default function ProGate({ locked, children }: ProGateProps) {
  const { userData } = useAuth();

  if (!locked || userData?.isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="w-locked-wrap">
      <div className="w-locked">{children}</div>
      <Link href="/world/pro" className="w-lock-veil">
        <span className="w-lock-ico">
          <Lock size={20} strokeWidth={2.5} />
        </span>
        <b>PRO Article</b>
        <span className="w-lock-sub">Unlock with PRO</span>
      </Link>
    </div>
  );
}
