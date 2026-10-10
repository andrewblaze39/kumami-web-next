/**
 * Firestore access for QA cleanup (kumami-dev only). Every item QA creates
 * through /admin starts with "[TEST]". The admin-content spec KEEPS its items
 * (deleted at the start of the next run, see personas.deleteTestContent);
 * throw-away items (e.g. the calendar round trip) are removed with `deleteQaDocs()`.
 */
import { loadEnvConfig } from '@next/env';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const QA_PREFIX = '[TEST]';

function db() {
  loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? 'null');
  if (!sa || sa.project_id !== 'kumami-dev') {
    throw new Error(`QA cleanup refuses to run outside kumami-dev (got ${sa?.project_id})`);
  }
  if (!getApps().length) initializeApp({ credential: cert(sa) });
  return getFirestore();
}

/** Delete docs in `collection` whose `titleField` starts with one of `prefixes`. Returns the count. */
export async function deleteQaDocs(collection: string, titleField: string, prefixes: string[]): Promise<number> {
  const snap = await db().collection(collection).get();
  const qa = snap.docs.filter((d) => prefixes.some((p) => String(d.get(titleField) ?? '').startsWith(p)));
  await Promise.all(qa.map((d) => d.ref.delete()));
  return qa.length;
}
