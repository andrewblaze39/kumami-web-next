/**
 * Reference screenshots for the product spec (v1.18 audit, 15 Nov 2026): every
 * product section gets a current picture. Covers the sections that had none
 * (Terms, Account deletion, Flow Radar Pro, Watchlist Pro, Crypto Address
 * Tracker, Subscriptions, Referrals), the stale ones (Basic Flow Radar, Basic
 * Watchlist, Market Pulse Pro) and News Portal + Fear & Greed in the Pro sidebar.
 * Saved to docs/qa/evidence/v1.18/spec/ with a manifest. Best effort per shot. kumami-dev only.
 *
 *   QA_PORT=3300 npx playwright test qa/features/v118-spec-screens.spec.ts --project=desktop
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, type Locator, type Page } from '@playwright/test';
import { AUTH } from '../helpers';

const DIR = path.join(__dirname, '..', '..', 'docs', 'qa', 'evidence', 'v1.18', 'spec');
type Shot = { section: string; file: string | null; caption: string };

function record(s: Shot) {
  let m: Shot[] = [];
  try { m = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8')) as Shot[]; } catch { /* first */ }
  const i = m.findIndex((x) => x.section === s.section);
  if (i >= 0) m[i] = s; else m.push(s);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(m, null, 2));
}

/** Go to a page and give its data time to arrive; a dead feed must not block the shot. */
async function go(page: Page, url: string) {
  await page.goto(url);
  await page.locator('#w-sidebar, main, body').first().waitFor({ state: 'visible', timeout: 90_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.locator('[aria-busy="true"]').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // close the cookie banner / pop-ups so they don't cover the page
  for (const name of [/accept/i, /got it/i, /^skip$/i, /close/i]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  await page.waitForTimeout(500);
}

async function shot(section: string, name: string, target: Locator | Page, caption: string) {
  fs.mkdirSync(DIR, { recursive: true });
  const file = `${name}.jpg`;
  try {
    if ('waitFor' in target) {
      await target.waitFor({ state: 'visible', timeout: 30_000 });
      await target.scrollIntoViewIfNeeded();
    }
    await target.screenshot({ path: path.join(DIR, file), type: 'jpeg', quality: 75 });
    record({ section, file, caption });
  } catch (e) {
    record({ section, file: null, caption: `${caption} — screenshot failed: ${String(e).slice(0, 140)}` });
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('free account', () => {
  test.use({ storageState: AUTH.plus, viewport: { width: 1440, height: 1000 } });

  test('Basic screens', async ({ page }) => {
    test.setTimeout(420_000);
    await go(page, '/terms');
    await shot('Basic §7', 'terms', page, 'Terms & Conditions (/terms), public page with the site footer.');

    await go(page, '/world/profile');
    const del = page.getByText(/Delete my account/i).first();
    await del.scrollIntoViewIfNeeded().catch(() => {});
    await shot('Basic §8', 'account-deletion', page, 'Profile → Profile tab: the red “Delete my account” panel under Account Information.');

    await go(page, '/world/flow-radar');
    await shot('Markets §3', 'flow-radar-basic', page, 'Flow Radar (Basic): the 5 core coins, HIGH and MED events, 15 minutes behind, with the verdict band.');

    await go(page, '/world/watchlist');
    await shot('Markets §6', 'watchlist-basic', page, 'Watchlist (Basic): BTC, ETH, SOL, BNB, HYPE with price, 24h change, Signal and Status.');

    await go(page, '/world/subscribe');
    await shot('Pro §21', 'subscribe', page, 'Subscribe page: Monthly $19.99 or Yearly $199.99, card or crypto, referral-code box.');

    await go(page, '/world/profile?tab=referrals');
    await shot('Pro §22', 'referrals', page, 'Profile → Referrals: personal code and link, paid referrals, balance and credit history.');
  });
});

test.describe('Pro account', () => {
  test.use({ storageState: AUTH.pro, viewport: { width: 1440, height: 1000 } });

  test('Pro screens', async ({ page }) => {
    test.setTimeout(480_000);
    await go(page, '/world/pro?tab=research');

    await page.locator('#w-sidebar').getByRole('link', { name: 'Fear & Greed', exact: true }).click();
    await go(page, '/world/fear-greed');
    await shot('Pro §12', 'pro-fear-greed', page, 'Fear & Greed in the Pro sidebar (News & Signals), 15 Nov 2026: the same page as in Basic; the workspace stays Pro.');

    await go(page, '/world/news');
    await shot('Basic §2 (Pro)', 'pro-news-portal', page, 'News Portal in the Pro sidebar (News & Signals), 15 Nov 2026: the same page as in Basic; the workspace stays Pro.');

    await go(page, '/world/pro?tab=spotpulse');
    await shot('Pro §5', 'market-pulse-pro', page, 'Market Pulse Pro: 10 coins, real-time spot vs futures activity.');

    await go(page, '/world/pro?tab=flowradar');
    await shot('Pro §18', 'flow-radar-pro', page, 'Flow Radar Pro: real-time, every coin, HIGH / MED / LOW, multi-coin filter, 1H / 4H / 24H / 7D.');

    await go(page, '/world/pro?tab=watchlist');
    await shot('Pro §19', 'watchlist-pro', page, 'Watchlist (Pro): A = the 5 core coins, B = your pinned coins, C = Also Worth Watching.');

    await go(page, '/world/pro?tab=addresstracker');
    const input = page.locator('input').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
      await input.press('Enter');
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(4000);
    }
    await shot('Pro §20', 'address-tracker', page, 'Crypto Address Tracker: a public wallet looked up — value, Whale tag, stats, holdings, recent activity.');

    await go(page, '/world/profile?tab=subscription');
    await shot('Pro §21 (Pro)', 'subscription-panel', page, 'Profile → Subscription (Pro account): plan, status, renewal date and the manage buttons.');
  });
});
