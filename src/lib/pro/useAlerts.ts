'use client';

/**
 * Client side of price alerts (v1.18): the alert list via /api/v1/me/alerts, and the user's
 * triggered alerts from `notifications` (kind 'price_alert', written by the collector).
 */
import { useCallback, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, v1 } from '@/lib/billing/clientApi';
import type { AlertDef, AlertState } from './priceAlerts';

type AlertsResponse = { alerts: AlertDef[]; state: Record<string, AlertState>; skippedLegacy?: number };

export function useAlerts() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await v1<AlertsResponse>('/me/alerts'));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t load your alerts.');
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads from the API (external system)
    void load();
    // Status (armed / triggered / paused) is updated by the server every minute.
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [currentUser, load]);

  const save = useCallback(async (alerts: AlertDef[], rearm: number[] = []) => {
    setSaving(true);
    try {
      setData(await v1<AlertsResponse>('/me/alerts', { method: 'PUT', body: { alerts, rearm } }));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t save your alerts.');
    } finally {
      setSaving(false);
    }
  }, []);

  return { ready: data !== null, alerts: data?.alerts ?? [], state: data?.state ?? {}, skippedLegacy: data?.skippedLegacy ?? 0, error, saving, save };
}

export type AlertNotification = { id: string; title: string; message: string; read: boolean; createdAt: number; alertId?: number };

/** The signed-in user's triggered price alerts, newest first (last 30). */
export function useAlertNotifications() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<AlertNotification[]>([]);
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;
    // Equality-only query (no composite index); the rules allow reading one's own notifications.
    const q = query(collection(db, 'notifications'), where('userId', '==', uid), limit(50));
    return onSnapshot(q, (snap) => {
      setItems(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<AlertNotification, 'id'> & { kind?: string }) }))
          .filter((n) => (n as { kind?: string }).kind === 'price_alert')
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 30),
      );
    }, () => setItems([]));
  }, [currentUser?.uid]);
  return items;
}
