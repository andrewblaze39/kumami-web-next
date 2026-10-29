/**
 * Price alerts storage (v1.18): price_alerts/{uid} = { uid, active, alerts: AlertDef[],
 * state: { [id]: AlertState }, updatedAt }. Written only by the server (API + collector), so
 * no client Firestore rule is needed. On first read, alerts saved before v1.18 in
 * users/{uid}/pro/state.alerts are imported (sentiment alerts have no data source and are left out).
 */
import 'server-only';

import {
  fromLegacyAlert, normalizeAlerts, type AlertDef, type AlertState, type LegacyAlert,
} from './priceAlerts';

export const PRICE_ALERTS = 'price_alerts';

export type AlertDoc = { alerts: AlertDef[]; state: Record<string, AlertState>; skippedLegacy?: number };

async function db() {
  const { adminDb } = await import('@/lib/firebase-admin');
  return adminDb();
}

export async function getAlerts(uid: string): Promise<AlertDoc> {
  const store = await db();
  const ref = store.collection(PRICE_ALERTS).doc(uid);
  const snap = await ref.get();
  if (snap.exists) {
    const d = snap.data() as Partial<AlertDoc>;
    return { alerts: normalizeAlerts(d.alerts), state: d.state ?? {}, skippedLegacy: d.skippedLegacy };
  }
  // First visit since v1.18: bring over the alerts saved in the old Pro state doc.
  const legacy = ((await store.doc(`users/${uid}/pro/state`).get()).get('alerts') ?? []) as LegacyAlert[];
  const converted = legacy.map(fromLegacyAlert);
  const alerts = normalizeAlerts(converted.filter(Boolean));
  const doc: AlertDoc = { alerts, state: {}, skippedLegacy: converted.length - alerts.length };
  await ref.set({ uid, active: alerts.some((a) => a.on), ...doc, updatedAt: new Date().toISOString() });
  return doc;
}

/** Replace the user's alerts. Unchanged alerts keep their state; new or edited ones (and `rearm` ids) start fresh. */
export async function saveAlerts(uid: string, input: unknown, rearm: number[] = []): Promise<AlertDoc> {
  const store = await db();
  const ref = store.collection(PRICE_ALERTS).doc(uid);
  const prev = await getAlerts(uid);
  const alerts = normalizeAlerts(input);
  const prevById = new Map(prev.alerts.map((a) => [a.id, a]));
  const state: Record<string, AlertState> = {};
  for (const a of alerts) {
    const p = prevById.get(a.id);
    const same = p && p.symbol === a.symbol && p.kind === a.kind && p.value === a.value;
    const s = prev.state[String(a.id)];
    // Resuming a paused alert arms it fresh, so it never fires on a condition that was already true.
    if (same && s && !rearm.includes(a.id) && !(p.on === false && a.on)) state[String(a.id)] = s;
  }
  const doc: AlertDoc = { alerts, state, skippedLegacy: prev.skippedLegacy };
  await ref.set({ uid, active: alerts.some((a) => a.on), ...doc, updatedAt: new Date().toISOString() });
  return doc;
}
