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
  if (mode === 'beginner') return '/world/news';
  if (mode === 'advanced') return '/world/console';
  return '/world/pro';
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

  // On mount: auto-correct mode based on current deep-link path (do NOT redirect)
  const correctedRef = useRef(false);
  useEffect(() => {
    if (correctedRef.current) return;
    correctedRef.current = true;
    const detected = detectModeFromPath(pathname);
    if (detected && detected !== mode) {
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

      // ---------- Continuity logic (from mockup setMode) ----------
      let destination: string;
      // switching to pro: always /world/pro
      if (newMode === 'pro') {
        destination = '/world/pro';
      }
      // advanced → beginner: always land /world/news (beginner default) regardless of which advanced route
      else if (mode === 'advanced' && newMode === 'beginner') {
        destination = defaultPageForMode('beginner'); // '/world/news'
      }
      // beginner on /world/news → switching to advanced: land /world/intel (news→intel continuity)
      else if (mode === 'beginner' && pathname.startsWith('/world/news') && newMode === 'advanced') {
        destination = '/world/intel';
      }
      // all other cases: default page for the new mode
      else {
        destination = defaultPageForMode(newMode);
      }

      setModeState(newMode);
      localStorage.setItem('kumami_world_mode', newMode);
      persistToFirestore(newMode);
      router.push(destination);
    },
    [mode, pathname, router, persistToFirestore]
  );

  return (
    <WorldModeContext.Provider value={{ mode, setMode, kumaOpen, setKumaOpen }}>
      {children}
    </WorldModeContext.Provider>
  );
}
