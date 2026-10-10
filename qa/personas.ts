/**
 * QA personas — created FRESH for every run through the real sign-up form and
 * deleted afterwards (Andrew, 10 Oct 2026). kumami-dev only.
 *
 *   qa1  new free user        → sees Basic + Plus, never Pro
 *   qa2  new user + Grant Pro → clicks "Grant Pro" in Profile → Subscription
 *   qa3  admin, NOT subscribed → Pro admin pages work, Pro tabs stay locked
 *
 * global-setup.ts writes the run's accounts to qa/.auth/personas.json;
 * global-teardown.ts deletes them (auth user, users doc + subcollections,
 * subscriptions, user_prefs) plus any "[QA]" content in pro_* collections.
 */
import fs from 'node:fs';
import { loadEnvConfig } from '@next/env';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export type PersonaKey = 'qa1' | 'qa2' | 'qa3';
export type Persona = { key: PersonaKey; name: string; email: string; password: string; uid?: string };

export const PERSONAS_FILE = 'qa/.auth/personas.json';
export const QA_DOMAIN = 'kumami.test';

/** Firebase Admin on kumami-dev — refuses any other project. */
export function admin() {
  loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? 'null');
  if (!sa || sa.project_id !== 'kumami-dev' || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'kumami-dev') {
    throw new Error(`QA refuses to run outside kumami-dev (service account: ${sa?.project_id}, app: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID})`);
  }
  if (!getApps().length) initializeApp({ credential: cert(sa) });
  return { auth: getAuth(), db: getFirestore() };
}

export function newPersonas(runId: string): Persona[] {
  const pw = () => `Qa!${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  return [
    { key: 'qa1', name: 'QA1 Free', email: `qa1-${runId}@${QA_DOMAIN}`, password: pw() },
    { key: 'qa2', name: 'QA2 Pro', email: `qa2-${runId}@${QA_DOMAIN}`, password: pw() },
    { key: 'qa3', name: 'QA3 Admin', email: `qa3-${runId}@${QA_DOMAIN}`, password: pw() },
  ];
}

export function readPersonas(): Record<PersonaKey, Persona> {
  const list = JSON.parse(fs.readFileSync(PERSONAS_FILE, 'utf8')) as Persona[];
  return Object.fromEntries(list.map((p) => [p.key, p])) as Record<PersonaKey, Persona>;
}

/** Delete every trace of the given QA accounts (and any leftover qa*-@kumami.test users). */
export async function deleteQaAccounts(extraUids: string[] = []) {
  const { auth, db } = admin();
  const uids = new Set(extraUids);
  let page = await auth.listUsers(1000);
  for (;;) {
    for (const u of page.users) if (u.email?.endsWith(`@${QA_DOMAIN}`) && /^qa\d-/.test(u.email)) uids.add(u.uid);
    if (!page.pageToken) break;
    page = await auth.listUsers(1000, page.pageToken);
  }
  for (const uid of uids) {
    await db.recursiveDelete(db.collection('users').doc(uid)).catch(() => {});
    await db.collection('user_prefs').doc(uid).delete().catch(() => {});
    const subs = await db.collection('subscriptions').where('userId', '==', uid).get();
    await Promise.all(subs.docs.map((d) => d.ref.delete()));
    await auth.deleteUser(uid).catch(() => {});
  }
  return uids.size;
}

/** Delete "[QA]"-prefixed docs from the Pro dashboard collections (title field varies by collection). */
export async function deleteQaContent() {
  const { db } = admin();
  const collections = ['pro_research', 'pro_airdrops', 'pro_calendar', 'pro_news', 'pro_events'];
  let n = 0;
  for (const c of collections) {
    const snap = await db.collection(c).get();
    for (const d of snap.docs) {
      const data = d.data();
      if (Object.values(data).some((v) => typeof v === 'string' && v.startsWith('[QA]'))) {
        await db.recursiveDelete(d.ref);
        n++;
      }
    }
  }
  return n;
}
