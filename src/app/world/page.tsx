'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Gate from '@/components/world/Gate';

export default function WorldPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      // I2: Mirror the SignupClient pattern — honour a stored redirect target
      // (set by SignUpModal.handleGoogle) then clear it; fall back to /world/news.
      const stored = sessionStorage.getItem('redirectAfterSignup');
      sessionStorage.removeItem('redirectAfterSignup');
      router.replace(stored || '/world/news');
    }
  }, [currentUser, loading, router]);

  // While resolving auth, show the dark bg without flashing
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: 'var(--bg-2, #08110e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* intentionally blank — avoids layout shift */}
      </div>
    );
  }

  // Already authed — redirect is in flight, render nothing
  if (currentUser) return null;

  return <Gate />;
}
