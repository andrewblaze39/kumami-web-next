'use client';

/**
 * Shows price alerts the moment the collector triggers them (v1.18 Following & Alerts), on any
 * page of the shell: an in-app toast per alert, plus a browser notification when the user has
 * allowed notifications for Kumami. Only alerts created after the page opened are shown.
 *
 * Toasts use Sonner, so several alerts firing in the same collector run stack (hover to expand)
 * instead of the newest one replacing the others.
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { useAlertNotifications, type AlertNotification } from '@/lib/pro/useAlerts';

const TOASTER_ID = 'kumami-alerts';

function AlertToast({ n, toastId }: { n: AlertNotification; toastId: string | number }) {
  return (
    <div className="w-alert-toast" role="status" aria-live="polite">
      <b>🔔 {n.title}</b>
      <span>{n.message}</span>
      <span className="w-alert-toast-actions">
        <Link href="/world/pro?tab=followhub" onClick={() => toast.dismiss(toastId)}>See alerts</Link>
        <button type="button" onClick={() => toast.dismiss(toastId)} aria-label="Dismiss alert">×</button>
      </span>
    </div>
  );
}

export default function AlertNotifier() {
  const items = useAlertNotifications();
  const [openedAt] = useState(() => Date.now());
  const shown = useRef(new Set<string>());

  useEffect(() => {
    const fresh = items.filter((n) => n.createdAt > openedAt && !shown.current.has(n.id));
    if (!fresh.length) return;
    // items are newest first; show oldest first so the newest ends up on top of the stack
    for (const n of [...fresh].reverse()) {
      shown.current.add(n.id);
      toast.custom((id) => <AlertToast n={n} toastId={id} />, { id: n.id, toasterId: TOASTER_ID, duration: 12_000 });
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(n.title, { body: n.message, tag: n.id });
        }
      } catch { /* browser refused: the in-app toast is still shown */ }
    }
  }, [items, openedAt]);

  return <Toaster id={TOASTER_ID} position="bottom-right" visibleToasts={5} offset={20} />;
}
