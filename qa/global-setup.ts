/**
 * Signs in each QA account once and saves its session to qa/.auth/<role>.json.
 * Firebase Auth keeps the session in IndexedDB, so storageState is saved with
 * `indexedDB: true`. Accounts are created by
 * `node .claude/skills/kumami-qa/scripts/setup-qa-accounts.mjs`.
 */
import { chromium, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import { loadEnvConfig } from '@next/env';
import { AUTH, ROLES, type Role } from './helpers';

async function signIn(baseURL: string, role: Role) {
  const { email, password } = ROLES[role];
  if (!email || !password) {
    throw new Error(`Missing QA_${role.toUpperCase()}_EMAIL/PASSWORD in .env.local — run setup-qa-accounts.mjs`);
  }
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseURL}/`);
  await page.getByRole('button', { name: /^log in$/i }).first().click();
  const dialog = page.locator('form').filter({ has: page.locator('input[type="password"]') }).last();
  await dialog.locator('input[type="email"]').fill(email);
  await dialog.locator('input[type="password"]').fill(password);
  await dialog.locator('button[type="submit"]').click();
  await page.waitForURL(/\/world\//, { timeout: 60_000 });
  fs.mkdirSync('qa/.auth', { recursive: true });
  await context.storageState({ path: AUTH[role], indexedDB: true });
  await browser.close();
}

/** Visit the data-heavy pages once so the dev server compiles them and the
 *  shared market cache is warm — otherwise the FIRST test hits a cold route +
 *  ~30 CoinGlass calls and times out (seen on /world/console). Best effort. */
async function warmUp(baseURL: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: AUTH.plus });
  const page = await context.newPage();
  for (const p of ['/world/console', '/world/onchain', '/world/flow-radar', '/world/fear-greed', '/world/calendar', '/world/watchlist']) {
    try {
      await page.goto(`${baseURL}${p}`);
      await page.locator('#w-sidebar').waitFor({ timeout: 90_000 });
      await page.waitForFunction(() => document.querySelectorAll('[aria-busy="true"]').length === 0, null, { timeout: 120_000 });
    } catch { /* warm-up only — the real tests report problems */ }
  }
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';
  for (const role of Object.keys(ROLES) as Role[]) {
    const file = AUTH[role];
    // Reuse a session saved in the last 6 hours (Firebase ID tokens refresh themselves).
    if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < 6 * 3_600_000) continue;
    await signIn(baseURL, role);
  }
  if (process.env.QA_SKIP_WARMUP !== '1') await warmUp(baseURL);
}
