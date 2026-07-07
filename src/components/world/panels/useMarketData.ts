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

  // Mounted guard — prevent state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(
    async (signal?: AbortSignal, isRetry = false): Promise<void> => {
      if (!currentUser) return;

      try {
        const token = await currentUser.getIdToken();

        if (signal?.aborted) return;

        const res = await fetch('/api/market/console', {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });

        if (res.status === 401 && !isRetry) {
          // Force-refresh the token and retry once
          const freshToken = await currentUser.getIdToken(/* forceRefresh */ true);

          if (signal?.aborted) return;

          const retryRes = await fetch('/api/market/console', {
            headers: { Authorization: `Bearer ${freshToken}` },
            signal,
          });
          if (!retryRes.ok) {
            throw new Error(`Auth retry failed: ${retryRes.status}`);
          }
          const data: ConsolePayload = await retryRes.json();
          if (!mountedRef.current || signal?.aborted) return;
          lastGoodRef.current = data;
          setState({ status: 'ok', data, error: null });
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: ConsolePayload = await res.json();
        if (!mountedRef.current || signal?.aborted) return;
        lastGoodRef.current = data;
        setState({ status: 'ok', data, error: null });
      } catch (err) {
        // Ignore aborts — component unmounted or a newer fetch superseded this one
        if (err instanceof Error && err.name === 'AbortError') return;
        if (!mountedRef.current) return;
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

  // Initial load — abort on currentUser change or unmount
  useEffect(() => {
    if (!currentUser) return;
    setState(prev =>
      prev.status === 'loading' ? prev : { status: 'loading', data: null, error: null }
    );
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [currentUser, fetchData]);

  // 5-minute polling interval — abort interval fetch on cleanup
  useEffect(() => {
    if (!currentUser) return;
    const id = setInterval(() => {
      const controller = new AbortController();
      void fetchData(controller.signal);
      // The controller is intentionally not stored — if the interval fires again
      // a new AbortController is created and the previous fetch will complete
      // naturally (or be superseded). The mounted-ref guard prevents stale setState.
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [currentUser, fetchData]);

  // Refetch on window focus — abort previous focus fetch on next focus
  useEffect(() => {
    let focusController: AbortController | null = null;
    const onFocus = () => {
      focusController?.abort();
      focusController = new AbortController();
      void fetchData(focusController.signal);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      focusController?.abort();
    };
  }, [fetchData]);

  // Manual refetch — creates its own controller; mounted-ref guards state update
  const refetch = useCallback(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
  }, [fetchData]);

  return { ...state, refetch };
}
