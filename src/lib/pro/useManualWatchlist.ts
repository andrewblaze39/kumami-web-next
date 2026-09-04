'use client';

/**
 * useManualWatchlist — a user's manually-pinned tickers, saved per-user at
 * `users/{uid}/pro/state.watchManual` (the same field the Pro dashboard uses).
 * Standalone so it can power the single Watchlist page independent of the Pro
 * dashboard's ProState provider. Writes only that one field (merge) so it never
 * disturbs the rest of the user's Pro state. Hydrates from the first snapshot,
 * then treats local state as source of truth to avoid clobbering rapid edits.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export function useManualWatchlist() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  const [manual, setManual] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const listRef = useRef<string[]>([]);
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = false;
    listRef.current = [];
    // Reset local state when the signed-in user changes, before re-subscribing.
    /* eslint-disable react-hooks/set-state-in-effect */
    setManual([]);
    setReady(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!uid) return;
    const ref = doc(db, 'users', uid, 'pro', 'state');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (readyRef.current) return;
        const arr = (snap.data()?.watchManual as string[] | undefined) ?? [];
        listRef.current = arr;
        setManual(arr);
        readyRef.current = true;
        setReady(true);
      },
      () => { readyRef.current = true; setReady(true); },
    );
    return () => unsub();
  }, [uid]);

  const write = useCallback((next: string[]) => {
    listRef.current = next;
    setManual(next);
    if (uid && readyRef.current) {
      void setDoc(doc(db, 'users', uid, 'pro', 'state'), { watchManual: next }, { merge: true });
    }
  }, [uid]);

  const add = useCallback((sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s || listRef.current.includes(s)) return;
    write([...listRef.current, s]);
  }, [write]);

  const remove = useCallback((sym: string) => {
    write(listRef.current.filter((x) => x !== sym));
  }, [write]);

  return { manual, add, remove, ready };
}
