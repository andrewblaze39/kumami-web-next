'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { useAuth } from '@/contexts/AuthContext';
import Gate from '@/components/world/Gate';
import { isSafeInternalPath } from '@/lib/safeInternalPath';
import './world/world.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

/**
 * HomeGateClient — the Kumami World gate rendered at the site root (/).
 *
 * Renders the <Gate /> hero immediately (even while auth is resolving) so
 * visitors never see a blank screen. Once a user is detected, a branded
 * loading overlay covers the gate while the redirect into the shell is in
 * flight (honouring any stored `redirectAfterSignup` target).
 */
export default function HomeGateClient() {
  const { currentUser } = useAuth();
  const router = useRouter();

  // Warm the default post-auth destination.
  useEffect(() => {
    router.prefetch('/world/news');
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      // Honour a stored redirect target (set by the signup/login flows and
      // WorldProtected) then clear it; fall back to /world/news.
      // Validate against open-redirect: only accept safe internal paths.
      const stored = sessionStorage.getItem('redirectAfterSignup');
      sessionStorage.removeItem('redirectAfterSignup');
      router.replace(isSafeInternalPath(stored) ? stored : '/world/news');
    }
  }, [currentUser, router]);

  return (
    <div className={`world-root ${jakarta.variable}`}>
      <Gate />
      {/* Redirect in flight — cover the gate with the branded loader */}
      {currentUser && (
        <div className="w-loading" aria-label="Loading…">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kumami-white.png" alt="Kumami" className="w-loading-logo" />
        </div>
      )}
    </div>
  );
}
