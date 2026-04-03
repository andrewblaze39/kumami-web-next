'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      sessionStorage.setItem('redirectAfterSignup', window.location.pathname + window.location.search);
      router.replace('/signup');
    }
  }, [currentUser, loading, router]);

  if (loading || !currentUser) return null;

  return <>{children}</>;
}
