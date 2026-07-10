'use client';

import { useState } from 'react';
import Image from 'next/image';
import KumaBear from './KumaBear';
import { SignUpModal, LogInModal } from './AuthModals';

type Modal = 'signup' | 'login' | null;

export default function Gate() {
  const [modal, setModal] = useState<Modal>(null);

  return (
    <>
      {/* ── Gate hero ── */}
      <div className="w-gate">
        {/* Logo */}
        <span className="w-gate-logo">
          <Image
            src="/logo-kumami-final.png"
            alt="Kumami World"
            width={120}
            height={40}
            style={{ height: 40, width: 'auto' }}
            priority
          />
        </span>

        {/* Kuma bear mascot */}
        <KumaBear className="w-gate-bear" width={150} height={150} />

        {/* Wordmark */}
        <h1>Kumami World</h1>

        {/* Tagline */}
        <p className="w-tag">
          Welcome to Kumami World —{' '}
          <span style={{ color: 'var(--accent)' }}>Where Web3 is made simple.</span>
        </p>

        {/* CTAs */}
        <div className="w-gate-cta">
          <button
            className="w-btn w-btn-primary w-btn-lg"
            onClick={() => setModal('signup')}
          >
            Sign Up — it&apos;s free
          </button>
          <button
            className="w-btn w-btn-ghost w-btn-lg"
            onClick={() => setModal('login')}
          >
            Log In
          </button>
        </div>

        {/* Feature pills */}
        <div className="w-gate-feats">
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            No wallet needed
          </span>
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Real-time crypto intel
          </span>
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Web3 education
          </span>
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            AI-powered insights
          </span>
        </div>

        {/* Footer */}
        <p className="w-gate-foot">
          © 2026 Kumami World · Web3, for everyone.
        </p>
      </div>

      {/* ── Modals ── */}
      {modal === 'signup' && (
        <SignUpModal
          onClose={() => setModal(null)}
          onSwitchToLogin={() => setModal('login')}
        />
      )}
      {modal === 'login' && (
        <LogInModal
          onClose={() => setModal(null)}
          onSwitchToSignUp={() => setModal('signup')}
        />
      )}
    </>
  );
}
