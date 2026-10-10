/**
 * Creates the run's QA personas from scratch, the way a real person would:
 *   1. Sign up through the gate's "Sign Up" modal (real form, real Firebase signup).
 *   2. Email verification: the harness marks the address verified with the
 *      Firebase Admin SDK (kumami-dev only) — what clicking the email link does.
 *   3. Log in through the "Log In" modal and save the session (Firebase auth
 *      lives in IndexedDB → storageState with indexedDB: true).
 *   4. qa2 clicks "Grant Pro" in Profile → Subscription (the temporary testing
 *      button that simulates a completed subscription), then re-saves its session.
 *   5. qa3 is promoted to role "admin" by the harness (stands in for a
 *      superadmin's Role Management change — never done on real users). Not subscribed.
 * Then warms the data pages. Teardown: global-teardown.ts.
 */
import { chromium, expect, type Browser, type FullConfig, type Page } from '@playwright/test';
import fs from 'node:fs';
import { AUTH } from './helpers';
import { admin, deleteQaAccounts, newPersonas, PERSONAS_FILE, type Persona } from './personas';

async function signUp(page: Page, p: Persona) {
  await page.goto('/');
  await page.getByRole('button', { name: /sign up/i }).first().click();
  const form = page.locator('form').filter({ has: page.locator('#su-name') });
  await form.locator('#su-name').fill(p.name);
  await form.locator('input[type="email"]').fill(p.email);
  await form.locator('input[type="password"]').fill(p.password);
  await form.locator('button[type="submit"]').click();
  // The account now exists (unverified). Wait until Firebase knows it.
  const { auth } = admin();
  await expect
    .poll(async () => (await auth.getUserByEmail(p.email).catch(() => null))?.uid ?? null, { timeout: 30_000 })
    .not.toBeNull();
  const user = await auth.getUserByEmail(p.email);
  p.uid = user.uid;
  await auth.updateUser(user.uid, { emailVerified: true }); // = clicking the verification link
}

async function logIn(page: Page, p: Persona) {
  await page.goto('/');
  await page.getByRole('button', { name: /^log in$/i }).first().click();
  const form = page.locator('form').filter({ has: page.locator('input[type="password"]') }).last();
  await form.locator('input[type="email"]').fill(p.email);
  await form.locator('input[type="password"]').fill(p.password);
  await form.locator('button[type="submit"]').click();
  await page.waitForURL(/\/world\//, { timeout: 60_000 });
}

async function grantPro(page: Page) {
  await page.goto('/world/profile');
  await page.getByRole('button', { name: /^subscription$/i }).first().click();
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/dev/test-subscription'), { timeout: 30_000 }),
    page.getByRole('button', { name: 'Grant Pro', exact: true }).click(),
  ]);
  if (!res.ok()) throw new Error(`Grant Pro failed: HTTP ${res.status()} ${await res.text()}`);
  // The button reloads the page itself; don't race it — open the profile fresh.
  await page.waitForTimeout(1500);
  await page.goto('/world/profile');
  await page.getByRole('button', { name: /^subscription$/i }).first().click();
  await expect(page.getByRole('button', { name: 'Remove Pro', exact: true })).toBeEnabled({ timeout: 30_000 });
}

async function createPersona(browser: Browser, baseURL: string, p: Persona) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await signUp(page, p);
  if (p.key === 'qa3') await admin().db.collection('users').doc(p.uid!).set({ role: 'admin' }, { merge: true });
  await context.close(); // the sign-up session is unverified — log in fresh
  const ctx2 = await browser.newContext({ baseURL });
  const page2 = await ctx2.newPage();
  await logIn(page2, p);
  // First login creates users/{uid} with isPremium:false (AuthContext.setupUser).
  // Granting before that write lands gets overwritten — wait for the doc first.
  await expect
    .poll(async () => (await admin().db.collection('users').doc(p.uid!).get()).exists, { timeout: 30_000 })
    .toBe(true);
  if (p.key === 'qa2') {
    await grantPro(page2);
    await expect
      .poll(async () => (await admin().db.collection('users').doc(p.uid!).get()).get('isPremium'), { timeout: 30_000 })
      .toBe(true);
  }
  const role = p.key === 'qa1' ? 'plus' : p.key === 'qa2' ? 'pro' : 'admin';
  await ctx2.storageState({ path: AUTH[role], indexedDB: true });
  await ctx2.close();
}

async function warmUp(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL, storageState: AUTH.plus });
  const page = await context.newPage();
  for (const p of ['/world/console', '/world/onchain', '/world/flow-radar', '/world/fear-greed', '/world/calendar', '/world/watchlist']) {
    try {
      await page.goto(p);
      await page.locator('#w-sidebar').waitFor({ timeout: 90_000 });
      await page.waitForFunction(() => document.querySelectorAll('[aria-busy="true"]').length === 0, null, { timeout: 120_000 });
    } catch { /* warm-up only — the real tests report problems */ }
  }
  await context.close();
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';
  admin(); // fail fast unless kumami-dev
  await deleteQaAccounts(); // leftovers from an interrupted run
  fs.mkdirSync('qa/.auth', { recursive: true });
  const personas = newPersonas(Date.now().toString(36));
  const browser = await chromium.launch();
  try {
    for (const p of personas) await createPersona(browser, baseURL, p);
  } finally {
    fs.writeFileSync(PERSONAS_FILE, JSON.stringify(personas, null, 2));
  }
  try {
    if (process.env.QA_SKIP_WARMUP !== '1') await warmUp(browser, baseURL);
  } finally {
    await browser.close();
  }
}
