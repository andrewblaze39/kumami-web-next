'use client';

/**
 * ProState — per-user interaction state for the Pro dashboard (follows, custom
 * alerts, the manual watchlist, and which live-event questions the user has
 * upvoted). Persisted to Firestore at `users/{uid}/pro/state`.
 *
 * Robustness notes: we hydrate from the first Firestore snapshot, then treat
 * local state as the source of truth (ignoring later snapshot echoes) so a
 * rapid user action is never clobbered by an in-flight read. All mutations read
 * the freshest state via a ref and write the whole doc with merge, and writes
 * are only issued after hydration so we never overwrite saved data with the
 * empty initial state. Consumers should gate interaction on `ready`.
 */

import {
  createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode,
} from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface Alert {
  id: number;
  /** Human-readable label, e.g. "BTC price changes by 5%". */
  label: string;
  on: boolean;
  /** Structured fields drive live monitoring (present on alerts built in-app). */
  subject?: string;   // e.g. "BTC"
  trigger?: 'price' | 'volume' | 'sentiment';
  threshold?: number; // percent
}

interface ProStateShape {
  following: Record<string, boolean>;
  alerts: Alert[];
  watchManual: string[];
  votedIds: string[];
}

const EMPTY_STATE: ProStateShape = { following: {}, alerts: [], watchManual: [], votedIds: [] };

interface ProStateContextValue extends ProStateShape {
  ready: boolean;
  isFollowing: (key: string) => boolean;
  toggleFollow: (key: string) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'on'>) => void;
  toggleAlert: (id: number) => void;
  deleteAlert: (id: number) => void;
  addWatch: (sym: string) => void;
  removeWatch: (sym: string) => void;
  hasVoted: (id: string) => boolean;
  markVoted: (id: string) => void;
}

const ProStateContext = createContext<ProStateContextValue | null>(null);

export function ProStateProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;

  const [state, setState] = useState<ProStateShape>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const stateRef = useRef<ProStateShape>(EMPTY_STATE);
  const readyRef = useRef(false);

  // Subscribe to the user's pro-state doc; hydrate from the first snapshot only.
  useEffect(() => {
    readyRef.current = false;
    stateRef.current = EMPTY_STATE;
    // Reset local state when the signed-in user changes, before re-subscribing.
    /* eslint-disable react-hooks/set-state-in-effect */
    setState(EMPTY_STATE);
    setReady(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!uid) return;

    const ref = doc(db, 'users', uid, 'pro', 'state');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (readyRef.current) return; // ignore echoes; local state is source of truth
        const data = snap.data() as Partial<ProStateShape> | undefined;
        const hydrated = { ...EMPTY_STATE, ...(data ?? {}) };
        stateRef.current = hydrated;
        setState(hydrated);
        readyRef.current = true;
        setReady(true);
      },
      () => { readyRef.current = true; setReady(true); },
    );
    return () => unsub();
  }, [uid]);

  // Write the whole doc (merge) from the freshest state; only after hydration.
  const write = useCallback((next: ProStateShape) => {
    stateRef.current = next;
    setState(next);
    if (uid && readyRef.current) {
      void setDoc(doc(db, 'users', uid, 'pro', 'state'), next, { merge: true });
    }
  }, [uid]);

  const isFollowing = useCallback((key: string) => !!stateRef.current.following[key], []);

  const toggleFollow = useCallback((key: string) => {
    const cur = stateRef.current;
    write({ ...cur, following: { ...cur.following, [key]: !cur.following[key] } });
  }, [write]);

  const addAlert = useCallback((alert: Omit<Alert, 'id' | 'on'>) => {
    if (!alert.label?.trim()) return;
    const cur = stateRef.current;
    write({ ...cur, alerts: [...cur.alerts, { ...alert, id: Date.now(), on: true }] });
  }, [write]);

  const toggleAlert = useCallback((id: number) => {
    const cur = stateRef.current;
    write({ ...cur, alerts: cur.alerts.map((a) => (a.id === id ? { ...a, on: !a.on } : a)) });
  }, [write]);

  const deleteAlert = useCallback((id: number) => {
    const cur = stateRef.current;
    write({ ...cur, alerts: cur.alerts.filter((a) => a.id !== id) });
  }, [write]);

  const addWatch = useCallback((sym: string) => {
    const s2 = sym.trim().toUpperCase();
    const cur = stateRef.current;
    if (!s2 || cur.watchManual.includes(s2)) return;
    write({ ...cur, watchManual: [...cur.watchManual, s2] });
  }, [write]);

  const removeWatch = useCallback((sym: string) => {
    const cur = stateRef.current;
    write({ ...cur, watchManual: cur.watchManual.filter((x) => x !== sym) });
  }, [write]);

  const hasVoted = useCallback((id: string) => stateRef.current.votedIds.includes(id), []);

  const markVoted = useCallback((id: string) => {
    const cur = stateRef.current;
    if (cur.votedIds.includes(id)) return;
    write({ ...cur, votedIds: [...cur.votedIds, id] });
  }, [write]);

  const value: ProStateContextValue = {
    ...state,
    ready,
    isFollowing,
    toggleFollow,
    addAlert,
    toggleAlert,
    deleteAlert,
    addWatch,
    removeWatch,
    hasVoted,
    markVoted,
  };

  return <ProStateContext.Provider value={value}>{children}</ProStateContext.Provider>;
}

export function useProState(): ProStateContextValue {
  const ctx = useContext(ProStateContext);
  if (!ctx) throw new Error('useProState must be used within a ProStateProvider');
  return ctx;
}
