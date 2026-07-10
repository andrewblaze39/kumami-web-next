'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export type WorldMode = 'beginner' | 'advanced' | 'pro';

interface WorldModeContextType {
  mode: WorldMode;
  setMode: (mode: WorldMode) => void;
  kumaOpen: boolean;
  setKumaOpen: (open: boolean) => void;
}

const WorldModeContext = createContext<WorldModeContextType | undefined>(undefined);

export function useWorldMode() {
  const ctx = useContext(WorldModeContext);
  if (!ctx) throw new Error('useWorldMode must be used within WorldModeProvider');
  return ctx;
}

// ---------- Route classification helpers ----------

// Routes that belong exclusively to each mode
// NOTE: '/world/courses' stays for the course-reader deep links
// (/world/courses/[phaseId]/…). The bare /world/courses and /world/dashboard
// pages now redirect to /world/education subtabs.
const BEGINNER_ROUTES = ['/world/news', '/world/courses', '/world/education', '/world/ailabs', '/world/games'];
const ADVANCED_ROUTES = ['/world/console', '/world/onchain', '/world/intel', '/world/watchlist'];
const PRO_ROUTES = ['/world/pro'];
// Shared routes: visible in every mode — visiting them never changes the mode.
const SHARED_ROUTES = ['/world/home', '/world/about', '/world/blogs', '/world/profile'];

// Match a route prefix on segment boundaries so e.g. '/world/profile'
// does NOT match the '/world/pro' prefix.
function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(route + '/');
}

function detectModeFromPath(pathname: string): WorldMode | null {
  // Shared routes never force a mode — keep whatever mode is current.
  if (SHARED_ROUTES.some(r => matchesRoute(pathname, r))) return null;
  // Higher tiers include lower-tier routes (Pro sees everything, Advanced sees
  // Beginner routes too), so only force a mode change if the route belongs to a
  // HIGHER tier than the current one. Lower-tier routes are accessible without
  // switching mode.  On first load (no stored mode) we still detect from path.
  if (PRO_ROUTES.some(r => matchesRoute(pathname, r))) return 'pro';
  if (ADVANCED_ROUTES.some(r => matchesRoute(pathname, r))) return 'advanced';
  if (BEGINNER_ROUTES.some(r => matchesRoute(pathname, r))) return 'beginner';
  // Unknown route: keep the current mode (caller treats null as "no change").
  return null;
}

function defaultPageForMode(mode: WorldMode): string {
  // From mockup: ST.sec defaults: beginner→'news', advanced→'intel'/'console', pro→'pro'
  // setMode default for advanced is 'console' (go(ST.sec[mode]) where ST.sec.advanced defaults to 'intel')
  // Cross-checking: initial ST.sec = {beginner:'news', advanced:'intel', pro:'pro'}
  // setMode sets ST.sec.pro='pro' always; for beginner/advanced it preserves continuity.
  // Default (no continuity): beginner→/world/news, advanced→/world/console (console is the "home" of advanced)
  if (mode === 'beginner') return '/world/education?tab=journey';
  if (mode === 'advanced') return '/world/console';
  return '/world/pro?tab=portfolio';
}

// ---------- Provider ----------

export function WorldModeProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from localStorage first (before render)
  const [mode, setModeState] = useState<WorldMode>(() => {
    if (typeof window === 'undefined') return 'beginner';
    const stored = localStorage.getItem('kumami_world_mode') as WorldMode | null;
    if (stored === 'beginner' || stored === 'advanced' || stored === 'pro') return stored;
    return 'beginner';
  });

  const [kumaOpen, setKumaOpen] = useState(false);

  // On mount: auto-correct mode based on current deep-link path (do NOT redirect).
  // Only correct UPWARD — a Pro user visiting /world/news should stay Pro, but a
  // Beginner visiting /world/console should be bumped to Advanced.
  const correctedRef = useRef(false);
  const TIER: Record<WorldMode, number> = { beginner: 0, advanced: 1, pro: 2 };
  useEffect(() => {
    if (correctedRef.current) return;
    correctedRef.current = true;
    const detected = detectModeFromPath(pathname);
    if (detected && TIER[detected] > TIER[mode]) {
      setModeState(detected);
      localStorage.setItem('kumami_world_mode', detected);
    }
  }, [pathname, mode]);

  // Persist to Firestore fire-and-forget
  const persistToFirestore = useCallback(
    (newMode: WorldMode) => {
      if (!currentUser) return;
      const ref = doc(db, 'user_prefs', currentUser.uid);
      setDoc(ref, { mode: newMode }, { merge: true }).catch(() => {
        // fire-and-forget: ignore errors
      });
    },
    [currentUser]
  );

  const setMode = useCallback(
    (newMode: WorldMode) => {
      if (newMode === mode) return;

      const TIER_NUM: Record<WorldMode, number> = { beginner: 0, advanced: 1, pro: 2 };

      // ---------- Continuity logic ----------
      // Higher tiers include lower-tier pages. If the current page is visible in
      // the new mode (i.e. switching to a higher tier, or staying on a shared
      // route), stay on the same page instead of redirecting.
      const detected = detectModeFromPath(pathname);
      const currentPageTier = detected ? TIER_NUM[detected] : -1;
      const stayOnPage = currentPageTier >= 0 && currentPageTier <= TIER_NUM[newMode];
      // Shared routes (detected === null, tier -1): always stay.
      const isShared = SHARED_ROUTES.some(r => matchesRoute(pathname, r));

      let destination: string;
      if (stayOnPage || isShared) {
        // Current page is accessible in the new mode — stay put.
        destination = pathname;
      }
      // Switching DOWN from a higher tier to lower: go to new mode's default
      // because the current page isn't available in the lower tier.
      else if (newMode === 'beginner' && pathname.startsWith('/world/news')) {
        destination = '/world/news';
      }
      // news → intel continuity when going beginner → advanced
      else if (mode === 'beginner' && pathname.startsWith('/world/news') && newMode === 'advanced') {
        destination = '/world/intel';
      }
      else {
        destination = defaultPageForMode(newMode);
      }

      setModeState(newMode);
      localStorage.setItem('kumami_world_mode', newMode);
      persistToFirestore(newMode);
      if (destination !== pathname) {
        router.push(destination);
      }
    },
    [mode, pathname, router, persistToFirestore]
  );

  return (
    <WorldModeContext.Provider value={{ mode, setMode, kumaOpen, setKumaOpen }}>
      {children}
    </WorldModeContext.Provider>
  );
}
