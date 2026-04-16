'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const ALLOWED_ROLES = [
  'superadmin',
  'admin',
  'gamesadmin',
  'newsresearchadmin',
  'newsdrafter',
  'marketanalysisadmin',
] as const;

const NEWSDRAFTER_PATHS = ['/admin/news', '/admin/news-drafts'];

export default function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    const role = userData?.role as string | undefined;
    if (!role || !ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      router.replace('/');
      return;
    }

    // Restrict newsdrafter to news pages only
    if (role === 'newsdrafter' && !NEWSDRAFTER_PATHS.includes(pathname)) {
      router.replace('/admin/news');
    }
  }, [currentUser, userData, loading, router, pathname]);

  if (loading) return null;
  if (!currentUser) return null;

  const role = userData?.role as string | undefined;
  if (!role || !ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) return null;
  if (role === 'newsdrafter' && !NEWSDRAFTER_PATHS.includes(pathname)) return null;

  return <>{children}</>;
}
