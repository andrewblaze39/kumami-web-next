'use client';

/**
 * useEducationProgress — fetches per-phase course progress from
 * /api/education/progress using the Firebase ID token.
 *
 * Waits for AuthContext hydration before fetching; if the user is not
 * signed in, returns an empty array immediately.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { CourseProgress } from '@/lib/education/progress';

export function useEducationProgress(): CourseProgress[] {
  const { currentUser, loading } = useAuth();
  const [progress, setProgress] = useState<CourseProgress[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      setProgress([]);
      return;
    }

    let cancelled = false;

    async function fetchProgress() {
      try {
        const token = await currentUser!.getIdToken();
        const res = await fetch('/api/education/progress', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setProgress(data.progress ?? []);
      } catch {
        // Silently fall back to empty progress
      }
    }

    fetchProgress();
    return () => { cancelled = true; };
  }, [currentUser, loading]);

  return progress;
}
