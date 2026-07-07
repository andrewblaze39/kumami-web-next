'use client';

/**
 * Generic parametric fetch hook for any /api/market/* endpoint.
 *
 * Mirrors the pattern in useMarketData.ts but is endpoint-agnostic:
 *   - 5-minute polling
 *   - Abort guard on dependency change / unmount
 *   - SWR-style stale data kept on error
 *   - 401 single-retry with force-refreshed token
 *   - Re-fetches when any dep in `params` changes (new asset/range selection)
 *
 * The original useMarketData.ts is preserved unchanged so the Console page
 * continues to work identically.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const REFRESH_INTERVAL_MS = 5 * 60 * 1_000; // 5 minutes

export type EndpointState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ok'; data: T; error: null }
  | { status: 'error'; data: T | null; error: string };

/**
 * @param path  Full path relative to origin, e.g. "/api/market/onchain?asset=BTC&range=24h"
 *              When `path` is null / empty the hook stays in loading state.
 */
export function useMarketEndpoint<T>(
  path: string | null
): EndpointState<T> & { refetch: () => void } {
  const { currentUser } = useAuth();
  const [state, setState] = useState<EndpointState<T>>({
    status: 'loading',
    data: null,
    error: null,
  });

  const lastGoodRef = useRef<T | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(
    async (signal?: AbortSignal, isRetry = false): Promise<void> => {
      if (!currentUser || !path) return;

      try {
        const token = await currentUser.getIdToken();
        if (signal?.aborted) return;

        const res = await fetch(path, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });

        if (res.status === 401 && !isRetry) {
          const freshToken = await currentUser.getIdToken(true);
          if (signal?.aborted) return;
          const retryRes = await fetch(path, {
            headers: { Authorization: `Bearer ${freshToken}` },
            signal,
          });
          if (!retryRes.ok) throw new Error(`Auth retry failed: ${retryRes.status}`);
          const data: T = await retryRes.json();
          if (!mountedRef.current || signal?.aborted) return;
          lastGoodRef.current = data;
          setState({ status: 'ok', data, error: null });
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: T = await res.json();
        if (!mountedRef.current || signal?.aborted) return;
        lastGoodRef.current = data;
        setState({ status: 'ok', data, error: null });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        const message = err instanceof Error ? err.message : 'Network error';
        setState({ status: 'error', data: lastGoodRef.current, error: message });
      }
    },
    [currentUser, path]
  );

  // Reset to loading + re-fetch when path (asset/range) or user changes
  useEffect(() => {
    if (!currentUser || !path) return;
    lastGoodRef.current = null;
    setState({ status: 'loading', data: null, error: null });
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [currentUser, path, fetchData]);

  // 5-minute polling
  useEffect(() => {
    if (!currentUser || !path) return;
    const id = setInterval(() => {
      const controller = new AbortController();
      void fetchData(controller.signal);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [currentUser, path, fetchData]);

  // Re-fetch on window focus
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

  const refetch = useCallback(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
  }, [fetchData]);

  return { ...state, refetch };
}
