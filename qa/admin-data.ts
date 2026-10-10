/**
 * Firestore access for QA cleanup (kumami-dev only). Specs that publish test
 * content through /admin call `deleteQaDocs()` in afterAll so a failed run
 * never leaves "[QA] …" items on the live dev site.
 */
import { loadEnvConfig } from '@next/env';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const QA_PREFIX = '[QA]';

function db() {
  loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? 'null');
  if (!sa || sa.project_id !== 'kumami-dev') {
    throw new Error(`QA cleanup refuses to run outside kumami-dev (got ${sa?.project_id})`);
  }
  if (!getApps().length) initializeApp({ credential: cert(sa) });
  return getFirestore();
}

/** Delete every doc in `collection` whose `titleField` starts with "[QA]". Returns the count. */
export async function deleteQaDocs(collection: string, titleField = 't'): Promise<number> {
  const snap = await db().collection(collection).get();
  const qa = snap.docs.filter((d) => String(d.get(titleField) ?? '').startsWith(QA_PREFIX));
  await Promise.all(qa.map((d) => d.ref.delete()));
  return qa.length;
}
