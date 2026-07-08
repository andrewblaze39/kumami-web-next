'use client';

/**
 * WorldProtected — auth guard for the /world/(app) shell.
 * Unauthenticated users are redirected to / (the gate), NOT /signup.
 * We do NOT modify the original ProtectedRoute.
 *
 * Race tolerance: AuthContext's login() resolves after signInWithEmailAndPassword,
 * but `currentUser` only updates on the next onAuthStateChanged tick. If we bounce
 * to `/` the instant `loading === false && !currentUser`, a just-logged-in user
 * hits a blank screen + bounce. A short grace period after mount absorbs that gap:
 * we keep showing the branded loader and only redirect once the grace expires
 * with still no user.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/** How long (ms) to tolerate a missing currentUser after mount before bouncing. */
const AUTH_GRACE_MS = 1500;

export default function WorldProtected({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  // True until AUTH_GRACE_MS after mount — covers the 1-tick currentUser gap.
  const [inGrace, setInGrace] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setInGrace(false), AUTH_GRACE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && !inGrace && !currentUser) {
      // Genuinely logged out — save intended URL so gate can redirect back after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterSignup', window.location.pathname + window.location.search);
      }
      router.replace('/');
    }
  }, [currentUser, loading, inGrace, router]);

  // Logged-in user: render the shell immediately (grace period never blocks them).
  if (currentUser) return <>{children}</>;

  // Auth still resolving, or within grace period, or redirect in flight —
  // show the branded loader instead of a blank background.
  return (
    <div className="world-root">
      <div className="w-loading" aria-label="Loading…">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-kumami-white.png" alt="Kumami" className="w-loading-logo" />
      </div>
    </div>
  );
}
