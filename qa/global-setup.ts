/**
 * Prepares the QA personas (see personas.ts):
 *   - deletes last run's throw-away accounts and [TEST] content (kept after a run on purpose);
 *   - FIXED qa1 / qa2 / qa3: signs them up through the real "Sign Up" modal only if
 *     they don't exist yet, then re-asserts their state (qa1 free, qa3 superadmin
 *     and NOT subscribed, qa2 Pro — granted by qa3 on /admin/subscriptions with
 *     no end date whenever qa2 isn't Pro);
 *   - FRESH qa0: a brand-new account through the sign-up form, every run;
 *   - logs each persona in through the "Log In" modal and saves the session
 *     (Firebase auth lives in IndexedDB → storageState with indexedDB: true).
 * Email verification: the harness marks the address verified with the Admin SDK
 * (kumami-dev only) — what clicking the email link does.
 */
import { chromium, expect, type Browser, type FullConfig, type Page } from '@playwright/test';
import fs from 'node:fs';
import { AUTH } from './helpers';
import { isProActive } from '../src/lib/pro';
import { admin, deleteFreshAccounts, deleteTestContent, fixedPersonas, freshPersona, PERSONAS_FILE, type Persona } from './personas';

async function signUp(page: Page, p: Persona) {
  await page.goto('/');
  await page.getByRole('button', { name: /sign up/i }).first().click();
  const form = page.locator('form').filter({ has: page.locator('#su-name') });
  await form.locator('#su-name').fill(p.name);
  await form.locator('input[type="email"]').fill(p.email);
  await form.locator('input[type="password"]').fill(p.password);
  await form.locator('button[type="submit"]').click();
  // Wait for the real "Check your inbox" state — sign-up saves the name and the
  // users doc before showing it; closing earlier would cut those writes off.
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible({ timeout: 30_000 });
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

/** qa3 (superadmin) grants qa2 Pro (no end date) through /admin/subscriptions — the real admin tool. */
async function grantViaAdmin(browser: Browser, baseURL: string, target: Persona) {
  const ctx = await browser.newContext({ baseURL, storageState: AUTH.admin });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept()); // "Grant Pro to …?" confirm
  await page.goto('/admin/subscriptions');
  await page.getByPlaceholder('Search by email or name').fill(target.email);
  const row = page.locator(`tr[data-user-email="${target.email}"]`);
  await expect(row).toBeVisible({ timeout: 60_000 });
  await row.getByLabel(`Duration for ${target.email}`).selectOption('null'); // No end date
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/admin/subscription'), { timeout: 30_000 }),
    row.getByRole('button', { name: 'Grant Pro' }).click(),
  ]);
  if (!res.ok()) throw new Error(`Admin grant failed: HTTP ${res.status()} ${await res.text()}`);
  await expect(row.getByRole('button', { name: 'Remove Pro' })).toBeVisible({ timeout: 30_000 });
  await ctx.close();
}

const ROLE_FILE = { qa0: AUTH.fresh, qa1: AUTH.plus, qa2: AUTH.pro, qa3: AUTH.admin } as const;

/** State each fixed persona must be in at the start of a run (qa2's Pro is granted through the UI). */
function expectedState(p: Persona): Record<string, unknown> {
  const base = { displayName: p.name };
  if (p.key === 'qa3') return { ...base, role: 'superadmin', isAdmin: false, isPremium: false, proUntil: null };
  if (p.key === 'qa2') return { ...base, role: 'user', isAdmin: false };
  return { ...base, role: 'user', isAdmin: false, isPremium: false, proUntil: null, subscriptionStatus: null };
}

async function preparePersona(browser: Browser, baseURL: string, p: Persona) {
  const { auth, db } = admin();
  const existing = p.fixed ? await auth.getUserByEmail(p.email).catch(() => null) : null;
  if (existing) {
    p.uid = existing.uid;
    // Keep the saved password authoritative (e.g. after someone reset it by hand).
    await auth.updateUser(existing.uid, { password: p.password, emailVerified: true, displayName: p.name });
  } else {
    const context = await browser.newContext({ baseURL });
    await signUp(await context.newPage(), p);
    await context.close(); // the sign-up session is unverified — log in fresh
  }
  if (p.fixed) await db.collection('users').doc(p.uid!).set(expectedState(p), { merge: true });

  const ctx = await browser.newContext({ baseURL });
  const page = await ctx.newPage();
  await logIn(page, p);
  // First login may create users/{uid} (AuthContext.setupUser) — wait for it, then
  // re-assert the fixed state so that write can't undo it.
  await expect.poll(async () => (await db.collection('users').doc(p.uid!).get()).exists, { timeout: 30_000 }).toBe(true);
  if (p.fixed) {
    await db.collection('users').doc(p.uid!).set(expectedState(p), { merge: true });
    // Pro follows point at last run's [TEST] airdrops (deleted above) — start empty.
    await db.collection('users').doc(p.uid!).collection('pro').doc('state').update({ following: {} }).catch(() => {});
  }
  await ctx.storageState({ path: ROLE_FILE[p.key], indexedDB: true });
  await ctx.close();
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
  const { db } = admin(); // fail fast unless kumami-dev
  const removedAccounts = await deleteFreshAccounts(); // last run's qa0 (+ any old per-run accounts)
  const removedContent = await deleteTestContent(); // last run's [TEST] items
  console.log(`[qa] cleaned up ${removedAccounts} throw-away accounts and ${removedContent} [TEST] items from the previous run`);
  fs.mkdirSync('qa/.auth', { recursive: true });
  const personas = [...fixedPersonas(), freshPersona(Date.now().toString(36))];
  const browser = await chromium.launch();
  try {
    // qa3 first: it grants qa2 Pro.
    for (const key of ['qa3', 'qa1', 'qa2', 'qa0'] as const) await preparePersona(browser, baseURL, personas.find((x) => x.key === key)!);
    const qa2 = personas.find((x) => x.key === 'qa2')!;
    const qa2Doc = (await db.collection('users').doc(qa2.uid!).get()).data() ?? {};
    if (!isProActive(qa2Doc as Parameters<typeof isProActive>[0]) || qa2Doc.proUntil) {
      // qa2 must be Pro with NO end date. Expired / time-limited → reset, then grant through the UI.
      await db.collection('users').doc(qa2.uid!).set({ isPremium: false, proUntil: null }, { merge: true });
      await grantViaAdmin(browser, baseURL, qa2);
      await expect
        .poll(async () => (await db.collection('users').doc(qa2.uid!).get()).get('isPremium'), { timeout: 30_000 })
        .toBe(true);
    }
  } finally {
    // Never write passwords to the personas file — fixed ones live in .env.local, qa0 is deleted after the run.
    fs.writeFileSync(PERSONAS_FILE, JSON.stringify(personas.map((p) => ({ ...p, password: undefined })), null, 2));
  }
  try {
    if (process.env.QA_SKIP_WARMUP !== '1') await warmUp(browser, baseURL);
  } finally {
    await browser.close();
  }
}
