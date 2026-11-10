'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Two workspaces since v1.18 (Rachelle v1.17 "Shell and workspaces"): Basic
 * (free — the old Basic and Plus merged, internal name 'advanced') and Pro.
 * 'beginner' stays in the type only so old stored values and links still load;
 * it is always read as 'advanced'.
 */
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
const ADVANCED_ROUTES = [
  // Learn & community pages (the old Basic workspace)
  '/world/news', '/world/courses', '/world/education', '/world/ailabs', '/world/games',
  // Markets (the old Plus workspace)
  '/world/console', '/world/onchain', '/world/flow-radar', '/world/fear-greed',
  '/world/calendar', '/world/watchlist',
  '/world/intel', '/world/spot-pulse', // retired — redirect into Plus pages
];
const PRO_ROUTES = ['/world/pro'];
// Shared routes: visible in every mode — visiting them never changes the mode.
// Settings is in both sidebars (v1.18), so it keeps the current workspace too.
const SHARED_ROUTES = ['/world/home', '/world/about', '/world/blogs', '/world/profile', '/world/settings'];

// Match a route prefix on segment boundaries so e.g. '/world/profile'
// does NOT match the '/world/pro' prefix.
function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(route + '/');
}

/**
 * Which workspace a page belongs to. Each workspace's sidebar shows ONLY its
 * own tier, so the workspace follows the page: opening a Basic page switches
 * to Basic, opening /world/pro switches to Pro.
 * Shared routes and unknown routes return null = keep the current workspace.
 */
function detectModeFromPath(pathname: string): WorldMode | null {
  if (SHARED_ROUTES.some(r => matchesRoute(pathname, r))) return null;
  if (PRO_ROUTES.some(r => matchesRoute(pathname, r))) return 'pro';
  if (ADVANCED_ROUTES.some(r => matchesRoute(pathname, r))) return 'advanced';
  // Unknown route: keep the current mode (caller treats null as "no change").
  return null;
}

function defaultPageForMode(mode: WorldMode): string {
  // Basic opens the Console (Rachelle's v1.18 sidebar starts at Console), Pro opens Console Pro.
  if (mode === 'pro') return '/world/pro?tab=digest';
  return '/world/console';
}

/** Old 'beginner' (stored values, links) is the merged Basic workspace now. */
function normalizeMode(m: WorldMode): WorldMode {
  return m === 'beginner' ? 'advanced' : m;
}

// ---------- Provider ----------

export function WorldModeProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from localStorage first (before render)
  const [mode, setModeState] = useState<WorldMode>(() => {
    if (typeof window === 'undefined') return 'advanced';
    const stored = localStorage.getItem('kumami_world_mode') as WorldMode | null;
    if (stored === 'beginner' || stored === 'advanced' || stored === 'pro') return normalizeMode(stored);
    return 'advanced';
  });

  const [kumaOpen, setKumaOpen] = useState(false);

  // The workspace follows the page (both directions, on every navigation —
  // deep links, in-app links like Daily Digest → Calendar, redirects), so the
  // tier-only sidebar always contains the page you're on. Never redirects.
  useEffect(() => {
    const detected = detectModeFromPath(pathname);
    if (!detected) return;
    setModeState((current) => {
      if (current === detected) return current;
      localStorage.setItem('kumami_world_mode', detected);
      return detected;
    });
  }, [pathname]);

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
    (requested: WorldMode) => {
      const newMode = normalizeMode(requested);
      if (newMode === mode) return;

      // Each workspace only lists its own tier, so switching workspace goes to
      // the new workspace's home page — unless the current page is shared
      // (Home, About, Blogs, Profile) or unknown, where we stay put. Staying
      // on, say, a Plus page after switching to Pro would immediately flip the
      // workspace back (it follows the page — see the effect above).
      const detected = detectModeFromPath(pathname);
      const destination = detected === null || detected === newMode ? pathname : defaultPageForMode(newMode);

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
