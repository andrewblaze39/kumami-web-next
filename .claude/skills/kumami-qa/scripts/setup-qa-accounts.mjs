// Create / refresh the two QA accounts used by Playwright QA (kumami-qa skill).
//
//   node .claude/skills/kumami-qa/scripts/setup-qa-accounts.mjs
//
// - Runs ONLY against the kumami-dev Firebase project (refuses anything else,
//   so it can never touch production users).
// - Idempotent: re-running keeps existing accounts, re-asserts their roles,
//   and only generates passwords that aren't already in .env.local.
// - Accounts: QA Plus  (role user,  isPremium false) → sees Basic + Plus
//             QA Pro   (role admin, isPremium true)  → sees Pro + /admin
// - Writes QA_PLUS_EMAIL / QA_PLUS_PASSWORD / QA_PRO_EMAIL / QA_PRO_PASSWORD
//   into .env.local (gitignored). Never prints passwords.

import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const ENV_FILE = '.env.local';
loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? 'null');
if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON missing from .env.local');
if (sa.project_id !== 'kumami-dev' || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'kumami-dev') {
  throw new Error(`Refusing to run: project is ${sa.project_id} / ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}, not kumami-dev`);
}
initializeApp({ credential: cert(sa) });
const auth = getAuth();
const db = getFirestore();

const ACCOUNTS = [
  { key: 'PLUS', email: 'qa-plus@kumami.test', name: 'QA Plus', role: 'user', isPremium: false, isAdmin: false },
  { key: 'PRO', email: 'qa-pro@kumami.test', name: 'QA Pro', role: 'admin', isPremium: true, isAdmin: true },
];

let envText = fs.readFileSync(ENV_FILE, 'utf8');
const envAdds = [];

for (const a of ACCOUNTS) {
  const pwKey = `QA_${a.key}_PASSWORD`;
  const emailKey = `QA_${a.key}_EMAIL`;
  const password = process.env[pwKey] || randomBytes(18).toString('base64url');

  let user;
  try {
    user = await auth.getUserByEmail(a.email);
    await auth.updateUser(user.uid, { password, emailVerified: true, displayName: a.name, disabled: false });
    console.log(`updated ${a.email} (${user.uid})`);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    user = await auth.createUser({ email: a.email, password, emailVerified: true, displayName: a.name });
    console.log(`created ${a.email} (${user.uid})`);
  }

  await db.collection('users').doc(user.uid).set({
    email: a.email,
    displayName: a.name,
    role: a.role,
    isAdmin: a.isAdmin,
    isPremium: a.isPremium,
    qaAccount: true, // marks the doc as test data
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  if (!process.env[emailKey]) envAdds.push(`${emailKey}=${a.email}`);
  if (!process.env[pwKey]) envAdds.push(`${pwKey}=${password}`);
}

if (envAdds.length) {
  envText = envText.replace(/\s*$/, '\n') + '\n# QA accounts for Playwright (kumami-qa skill) — kumami-dev only\n' + envAdds.join('\n') + '\n';
  fs.writeFileSync(ENV_FILE, envText);
  console.log(`wrote ${envAdds.length} QA_* entries to ${ENV_FILE}`);
} else {
  console.log('.env.local already has all QA_* entries');
}
process.exit(0);
