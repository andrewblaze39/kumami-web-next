/**
 * QA personas (Andrew, 10 Oct 2026) — kumami-dev only.
 *
 *   qa0  FRESH every run: signs up through the real form, deleted after the run.
 *        Used for the new-user path (sign-up name) and every test that changes
 *        account state (Grant / expiry / Remove Pro, Firestore-rules probes).
 *   qa1  FIXED free user, never subscribed        → Basic + Plus only
 *   qa2  FIXED Pro user (granted by qa3, no end date) → full Pro
 *   qa3  FIXED superadmin, NOT subscribed          → admin pages; authors [TEST] content
 *
 * Fixed accounts are created once (credentials saved to .env.local as
 * QA1_EMAIL / QA1_PASSWORD …) and re-created only if missing. Their role and
 * Pro state are re-asserted every run so an earlier run can't leave them dirty.
 *
 * Test content: everything qa3 creates starts with "[TEST]". It is KEPT after a
 * run (so Andrew can look at it) and deleted at the START of the next run.
 */
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { loadEnvConfig } from '@next/env';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export type PersonaKey = 'qa0' | 'qa1' | 'qa2' | 'qa3';
export type Persona = { key: PersonaKey; name: string; email: string; password: string; uid?: string; fixed: boolean };

export const PERSONAS_FILE = 'qa/.auth/personas.json';
export const QA_DOMAIN = 'kumami.test';
export const TEST_PREFIX = '[TEST]';
const LEGACY_PREFIXES = ['[QA]'];
const ENV_FILE = '.env.local';

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

const FIXED: { key: 'qa1' | 'qa2' | 'qa3'; name: string }[] = [
  { key: 'qa1', name: 'QA1 Free' },
  { key: 'qa2', name: 'QA2 Pro' },
  { key: 'qa3', name: 'QA3 Admin' },
];

const newPassword = () => `Qa!${randomBytes(12).toString('base64url')}`;

/** Fixed personas from .env.local; generates and appends credentials the first time. */
export function fixedPersonas(): Persona[] {
  admin(); // loads .env.local
  const adds: string[] = [];
  const out = FIXED.map(({ key, name }) => {
    const K = key.toUpperCase();
    const read = (field: 'EMAIL' | 'PASSWORD', make: () => string) => {
      let v = process.env[`${K}_${field}`];
      if (!v) { v = make(); process.env[`${K}_${field}`] = v; adds.push(`${K}_${field}=${v}`); }
      return v;
    };
    return { key, name, email: read('EMAIL', () => `${key}@${QA_DOMAIN}`), password: read('PASSWORD', newPassword), fixed: true } as Persona;
  });
  if (adds.length) {
    const txt = fs.readFileSync(ENV_FILE, 'utf8').replace(/\s*$/, '\n');
    fs.writeFileSync(ENV_FILE, `${txt}\n# Fixed QA personas (kumami-qa skill) — kumami-dev only\n${adds.join('\n')}\n`);
  }
  return out;
}

export function freshPersona(runId: string): Persona {
  return { key: 'qa0', name: 'QA0 New', email: `qa0-${runId}@${QA_DOMAIN}`, password: newPassword(), fixed: false };
}

/** The run's personas as written by global-setup (no passwords). */
export function readPersonas(): Record<PersonaKey, Omit<Persona, 'password'>> {
  const list = JSON.parse(fs.readFileSync(PERSONAS_FILE, 'utf8')) as Omit<Persona, 'password'>[];
  return Object.fromEntries(list.map((p) => [p.key, p])) as Record<PersonaKey, Omit<Persona, 'password'>>;
}

/** Remove every trace of one account (auth user, users doc + subcollections, prefs, subscriptions, audit). */
export async function deleteAccount(uid: string) {
  const { auth, db } = admin();
  await db.recursiveDelete(db.collection('users').doc(uid)).catch(() => {});
  await db.collection('user_prefs').doc(uid).delete().catch(() => {});
  const subs = await db.collection('subscriptions').where('userId', '==', uid).get();
  await Promise.all(subs.docs.map((d) => d.ref.delete()));
  const audit = await db.collection('admin_audit').where('targetUid', '==', uid).get();
  await Promise.all(audit.docs.map((d) => d.ref.delete()));
  await auth.deleteUser(uid).catch(() => {});
}

/**
 * Delete throw-away QA accounts: qa0-<run>@ plus the older per-run qa1-/qa2-/qa3-<run>@
 * ones. Never touches the fixed qa1@ / qa2@ / qa3@ accounts.
 */
export async function deleteFreshAccounts(extraUids: string[] = []) {
  const { auth } = admin();
  const uids = new Set(extraUids);
  let page = await auth.listUsers(1000);
  for (;;) {
    for (const u of page.users) if (u.email?.endsWith(`@${QA_DOMAIN}`) && /^qa\d-[a-z0-9]+@/.test(u.email)) uids.add(u.uid);
    if (!page.pageToken) break;
    page = await auth.listUsers(1000, page.pageToken);
  }
  for (const uid of uids) await deleteAccount(uid);
  return uids.size;
}

const isTestText = (v: unknown) => typeof v === 'string' && [TEST_PREFIX, ...LEGACY_PREFIXES].some((p) => v.startsWith(p));

/** Admin-managed collections qa3 writes [TEST] items into. */
/** The Market Analysis image qa3 uploads (Storage path the admin form uses: marketAnalysisImages/<file name>). */
export const TEST_IMAGE = { fixture: 'qa/fixtures/qa-test-chart.png', storagePath: 'marketAnalysisImages/qa-test-chart.png' };

export const TEST_COLLECTIONS = ['pro_research', 'pro_airdrops', 'pro_calendar', 'pro_news', 'pro_events', 'alphaRoom', 'marketAnalysis'];

/** Delete every [TEST] item (and legacy [QA] ones) from the admin-managed collections. */
export async function deleteTestContent() {
  const { db } = admin();
  let n = 0;
  for (const c of TEST_COLLECTIONS) {
    const snap = await db.collection(c).get();
    for (const d of snap.docs) {
      if (Object.values(d.data()).some(isTestText)) {
        await db.recursiveDelete(d.ref);
        n++;
      }
    }
  }
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (bucket) await getStorage().bucket(bucket).file(TEST_IMAGE.storagePath).delete().catch(() => {});
  return n;
}
