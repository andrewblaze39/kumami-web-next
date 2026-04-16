'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProOnlyRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    if (!userData?.isPremium) {
      router.replace('/');
    }
  }, [currentUser, userData, loading, router]);

  if (loading || !currentUser || !userData?.isPremium) return null;

  return <>{children}</>;
}
