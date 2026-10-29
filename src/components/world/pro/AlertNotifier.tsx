'use client';

/**
 * Shows a price alert the moment the collector triggers it (v1.18 Following & Alerts), on any
 * page of the shell: an in-app toast, plus a browser notification when the user has allowed
 * notifications for Kumami. Only alerts created after the page opened are shown.
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAlertNotifications, type AlertNotification } from '@/lib/pro/useAlerts';

export default function AlertNotifier() {
  const items = useAlertNotifications();
  const [openedAt] = useState(() => Date.now());
  const shown = useRef(new Set<string>());
  const [toast, setToast] = useState<AlertNotification | null>(null);

  useEffect(() => {
    const fresh = items.filter((n) => n.createdAt > openedAt && !shown.current.has(n.id));
    if (!fresh.length) return;
    for (const n of fresh) shown.current.add(n.id);
    const latest = fresh[0];
    setToast(latest);
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(latest.title, { body: latest.message, tag: latest.id });
      }
    } catch { /* browser refused: the in-app toast is still shown */ }
  }, [items, openedAt]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 12_000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  return (
    <div className="w-alert-toast" role="status" aria-live="polite">
      <b>🔔 {toast.title}</b>
      <span>{toast.message}</span>
      <span className="w-alert-toast-actions">
        <Link href="/world/pro?tab=followhub" onClick={() => setToast(null)}>See alerts</Link>
        <button type="button" onClick={() => setToast(null)} aria-label="Dismiss alert">×</button>
      </span>
    </div>
  );
}
