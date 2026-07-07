'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ConsolePayload } from '@/lib/market/contracts';

const REFRESH_INTERVAL_MS = 5 * 60 * 1_000; // 5 minutes

export type MarketDataState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ok'; data: ConsolePayload; error: null }
  | { status: 'error'; data: ConsolePayload | null; error: string };

export function useMarketData(): MarketDataState & { refetch: () => void } {
  const { currentUser } = useAuth();
  const [state, setState] = useState<MarketDataState>({ status: 'loading', data: null, error: null });

  // Keep last-good data around so SWR-style refresh failures keep showing stale data
  const lastGoodRef = useRef<ConsolePayload | null>(null);

  const fetchData = useCallback(
    async (isRetry = false): Promise<void> => {
      if (!currentUser) return;

      try {
        const token = await currentUser.getIdToken();
        const res = await fetch('/api/market/console', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 && !isRetry) {
          // Force-refresh the token and retry once
          const freshToken = await currentUser.getIdToken(/* forceRefresh */ true);
          const retryRes = await fetch('/api/market/console', {
            headers: { Authorization: `Bearer ${freshToken}` },
          });
          if (!retryRes.ok) {
            throw new Error(`Auth retry failed: ${retryRes.status}`);
          }
          const data: ConsolePayload = await retryRes.json();
          lastGoodRef.current = data;
          setState({ status: 'ok', data, error: null });
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: ConsolePayload = await res.json();
        lastGoodRef.current = data;
        setState({ status: 'ok', data, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error';
        // Keep last good data visible if we have it (SWR-style)
        setState({
          status: 'error',
          data: lastGoodRef.current,
          error: message,
        });
      }
    },
    [currentUser]
  );

  // Initial load
  useEffect(() => {
    if (!currentUser) return;
    setState(prev =>
      prev.status === 'loading' ? prev : { status: 'loading', data: null, error: null }
    );
    void fetchData();
  }, [currentUser, fetchData]);

  // 5-minute polling interval
  useEffect(() => {
    if (!currentUser) return;
    const id = setInterval(() => void fetchData(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [currentUser, fetchData]);

  // Refetch on window focus (nice-to-have)
  useEffect(() => {
    const onFocus = () => void fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData]);

  return { ...state, refetch: () => void fetchData() };
}
