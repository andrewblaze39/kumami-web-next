'use client';

/**
 * WorldProtected — auth guard for the /world/(app) shell.
 * Unauthenticated users are redirected to / (the gate), NOT /signup.
 * We do NOT modify the original ProtectedRoute.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function WorldProtected({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      // Save intended URL so gate can redirect back after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterSignup', window.location.pathname + window.location.search);
      }
      router.replace('/');
    }
  }, [currentUser, loading, router]);

  // Show world-themed spinner while auth state resolves
  if (loading) {
    return (
      <div className="world-root">
        <div className="w-loading" aria-label="Loading…" />
      </div>
    );
  }

  // Not authenticated — redirect in progress, render nothing
  if (!currentUser) return null;

  return <>{children}</>;
}
