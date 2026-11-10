/**
 * Evidence screenshots for v1.18 — Rachelle's workspaces ask (her v1.17 "Shell and
 * workspaces" + her newest sidebar design): Basic + Plus merged into Basic, her sidebar
 * order and names for Basic and Pro, "Plus" dropped from names, Console Pro.
 * Items R22–R26 (release notes Part 1). Saved next to the other v1.18 evidence in
 * docs/qa/evidence/v1.18/ (manifest-raw.json). Best effort per shot. kumami-dev only.
 *
 *   QA_PORT=3300 npx playwright test qa/features/v118-workspaces-evidence.spec.ts --project=desktop
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { AUTH, openPage } from '../helpers';

const DIR = path.join(__dirname, '..', '..', 'docs', 'qa', 'evidence', 'v1.18');
type Shot = { item: string; file: string | null; caption: string };
function record(s: Shot) {
  let manifest: Shot[] = [];
  try { manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest-raw.json'), 'utf8')) as Shot[]; } catch { /* first shot */ }
  const i = manifest.findIndex((m) => (s.file ? m.file === s.file : m.item === s.item && m.file === null && m.caption === s.caption));
  if (i >= 0) manifest[i] = s; else manifest.push(s);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'manifest-raw.json'), JSON.stringify(manifest, null, 2));
}
async function shot(item: string, name: string, target: Locator | Page, caption: string) {
  fs.mkdirSync(DIR, { recursive: true });
  const file = `${item.toLowerCase()}-${name}.jpg`;
  try {
    if ('waitFor' in target) {
      await target.waitFor({ state: 'visible', timeout: 30_000 });
      await target.scrollIntoViewIfNeeded();
    }
    await target.screenshot({ path: path.join(DIR, file), type: 'jpeg', quality: 72 });
    record({ item, file, caption });
  } catch (e) {
    record({ item, file: null, caption: `${caption} — screenshot failed: ${String(e).slice(0, 120)}` });
  }
}
const navTexts = (page: Page) => page.locator('#w-sidebar nav .w-nav-item span:not(.w-nav-lock)').allInnerTexts();
/** Let the panels finish loading; a slow market feed must not block the screenshot. */
async function settle(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 60_000 }).catch(() => {});
}

test.describe('workspaces (free account)', () => {
  test.use({ storageState: AUTH.plus, viewport: { width: 1440, height: 1000 } });

  test('Basic sidebar, switch, Home in the logo menu, renamed pages', async ({ page }) => {
    test.setTimeout(300_000);
    await openPage(page, '/world/console').catch(() => {});
    await settle(page);
    const items = await navTexts(page);
    const sidebar = page.locator('#w-sidebar');
    await shot('R23', 'basic-sidebar', sidebar, `Basic sidebar, top to bottom: ${items.join(' · ')}. No Home item, no "Plus" in any name.`);
    const sw = await page.locator('.w-mode-switch button').allInnerTexts();
    await shot('R22', 'workspace-switch', page.locator('.w-mode-toggle-wrap'), `The workspace switch has two options: ${sw.map((s) => s.trim()).join(' / ')}. The badge next to the logo says BASIC.`);
    await shot('R22', 'basic-console', page, 'Basic workspace opens on the Console (page title "Console", no "Plus" badge).');

    await page.locator('.w-brand').click();
    await shot('R23', 'logo-menu-home', page.locator('.w-brand-menu'), 'Home moved to the logo menu (top of the Company list).');
    await page.keyboard.press('Escape');

    for (const [p, name, what] of [
      ['/world/flow-radar', 'flow-radar', 'Flow Radar (was "Flow Radar Plus")'],
      ['/world/watchlist', 'watchlist', 'Watchlist (was "Watchlist Plus")'],
      ['/world/onchain', 'market-pulse', 'Market Pulse (was "On-Chain Insights" / "Market Structure")'],
    ] as const) {
      await openPage(page, p).catch(() => {});
      const h1 = (await page.getByRole('heading', { level: 1 }).first().innerText().catch(() => '')).trim();
      await shot('R24', `${name}-title`, page.locator('.w-oc-head, .w-page-head').first(), `${what}: the page title reads "${h1}".`);
    }
  });
});

test.describe('workspaces (Pro account)', () => {
  test.use({ storageState: AUTH.pro, viewport: { width: 1440, height: 1000 } });

  test('Pro sidebar and Console Pro', async ({ page }) => {
    test.setTimeout(240_000);
    await openPage(page, '/world/pro?tab=digest').catch(() => {});
    await settle(page);
    const items = await navTexts(page);
    await shot('R25', 'pro-sidebar', page.locator('#w-sidebar'), `Pro sidebar, top to bottom: ${items.join(' · ')}. Groups: News & Signals, Tools. Market Analysis and Kuma AI Chat are no longer listed.`);
    await shot('R26', 'console-pro', page, 'Console Pro (replaces the Daily Digest): Market Conditions, Your assets, Market Pulse Pro (10 coins, real-time), Flow Radar real-time with a coin filter, Calendar Pro, Watchlist with your coins.');
    await shot('R26', 'console-pro-top', page.locator('.w-console-pro .w-adv-head'), 'Console Pro header: "Real-time" (the Basic Console says "Live" and its Flow Radar is 15 minutes behind).');

    const customize = page.getByRole('button', { name: /Customize/ });
    if (await customize.isVisible().catch(() => false)) {
      await customize.click();
      await shot('R26', 'your-assets-picker', page.locator('.w-cpro-picker'), 'Your assets → Customize: pick up to 5 coins from the 5 anchors and the coins in your Watchlist. Saved to your account.');
      await page.getByRole('button', { name: /Done/ }).click().catch(() => {});
    } else {
      record({ item: 'R26', file: null, caption: 'Your assets: the Customize button did not show (the assets request failed or is still loading).' });
    }
    const flow = page.locator('[data-tour="flow"]').first();
    await shot('R26', 'console-pro-flow', flow, 'Console Pro Flow Radar: real-time events from every coin, with a coin filter row.');
    const bento = page.locator('.w-console-pro .w-r3');
    await shot('R26', 'console-pro-calendar-watchlist', bento, 'Calendar Pro (airdrop days, unlocks, Pro-only events) and Watchlist Pro (anchors, your coins, Also Worth Watching).');
  });
});
