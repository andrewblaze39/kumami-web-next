/**
 * Server-side price-alert check (v1.18 point 5), run by the cron collector every minute: every
 * user with an active alert, one Binance 24h ticker call for all coins, evaluateAlert per alert.
 * A trigger writes a `notifications` doc ({ userId, kind: 'price_alert', title, message, read })
 * which the user's browser shows in-app and, if allowed, as a browser notification. Alerts of
 * accounts that are no longer Pro are not checked. Never throws into the collector.
 */
import 'server-only';

import { isProActive } from '@/lib/pro';
import { binanceTickers } from '@/lib/market/live/binance';
import { alertLabel, evaluateAlert, normalizeAlerts, type AlertState } from './priceAlerts';
import { PRICE_ALERTS } from './alertStore';

export type AlertRunResult = { users: number; checked: number; fired: number; ms: number };

export async function runPriceAlerts(now = Date.now()): Promise<AlertRunResult> {
  const t0 = Date.now();
  const { adminDb } = await import('@/lib/firebase-admin');
  const db = adminDb();
  const snap = await db.collection(PRICE_ALERTS).where('active', '==', true).get();
  if (snap.empty) return { users: 0, checked: 0, fired: 0, ms: Date.now() - t0 };

  const tickers = await binanceTickers();
  let checked = 0;
  let fired = 0;
  for (const doc of snap.docs) {
    const uid = doc.id;
    const user = (await db.doc(`users/${uid}`).get()).data();
    if (!isProActive(user ?? null, now)) continue;
    const alerts = normalizeAlerts(doc.get('alerts'));
    const prevState = (doc.get('state') ?? {}) as Record<string, AlertState>;
    const state: Record<string, AlertState> = { ...prevState };
    let changed = false;
    const batch = db.batch();
    const nextAlerts = alerts.map((a) => {
      if (!a.on) return a;
      checked++;
      const r = evaluateAlert(a, prevState[String(a.id)], tickers[a.symbol] ?? null, now);
      if (r.state !== prevState[String(a.id)]) { state[String(a.id)] = r.state; changed = true; }
      if (!r.trigger) return a;
      fired++;
      batch.set(db.collection('notifications').doc(), {
        userId: uid,
        kind: 'price_alert',
        alertId: a.id,
        title: `Alert: ${alertLabel(a)}`,
        message: r.trigger.message,
        read: false,
        timestamp: new Date(now),
        createdAt: now,
      });
      return r.pause ? { ...a, on: false } : a;
    });
    if (!changed) continue;
    batch.set(doc.ref, { alerts: nextAlerts, state, active: nextAlerts.some((a) => a.on), checkedAt: now }, { merge: true });
    await batch.commit();
  }
  return { users: snap.size, checked, fired, ms: Date.now() - t0 };
}
