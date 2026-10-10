/**
 * QA — tier-only sidebar (Andrew, 10 Oct 2026): each workspace's sidebar shows
 * ONLY its own tier; the workspace follows the page you're on; switching
 * workspace jumps to that workspace's home page. Home is in every workspace.
 * Also: Pro accounts keep Watchlist Pro sections on the (Plus) Watchlist page.
 */
import { expect, test, type Page } from '@playwright/test';
import { AUTH, guard, openPage, snap } from '../helpers';

const sidebar = (page: Page) => page.locator('#w-sidebar');
const badge = (page: Page) => page.locator('.w-mode-badge');
const navLink = (page: Page, name: string) => sidebar(page).getByRole('link', { name, exact: true });

const PLUS_ITEMS = ['Console', 'On-Chain Insights', 'Flow Radar Plus', 'Fear & Greed', 'Calendar', 'Watchlist Plus', 'Settings'];
const BASIC_ITEMS = ['News Portal', 'My Journey', 'My Courses', 'Cryptopedia', 'AI Labs', 'Games'];
const PRO_ITEMS = ['Daily Digest', 'Following & Alerts', 'Flow Radar Pro', 'Watchlist Pro', 'Spot Pulse Pro'];

async function expectOnly(page: Page, shown: string[], hidden: string[]) {
  for (const n of shown) await expect(navLink(page, n), `"${n}" should be in the sidebar`).toBeVisible();
  for (const n of hidden) await expect(navLink(page, n), `"${n}" should NOT be in the sidebar`).toHaveCount(0);
  await expect(navLink(page, 'Home')).toBeVisible();
}

test.describe('Plus account', () => {
  test.use({ storageState: AUTH.plus });

  test('Plus workspace lists only Plus tools', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/console');
    await expect(badge(page)).toHaveText('PLUS');
    await expectOnly(page, PLUS_ITEMS, [...BASIC_ITEMS, ...PRO_ITEMS]);
    await snap(page, info, 'sidebar-plus');
    g.assertClean();
  });

  test('every Plus page puts you in the Plus workspace (Calendar used to show Basic)', async ({ page }) => {
    for (const p of ['/world/calendar', '/world/flow-radar', '/world/fear-greed', '/world/settings', '/world/watchlist']) {
      await openPage(page, p);
      await expect(badge(page), p).toHaveText('PLUS');
    }
  });

  test('Basic pages switch to the Basic workspace and list only Basic items', async ({ page }, info) => {
    await openPage(page, '/world/news');
    await expect(badge(page)).toHaveText('BASIC');
    await expectOnly(page, BASIC_ITEMS, [...PLUS_ITEMS, ...PRO_ITEMS]);
    await snap(page, info, 'sidebar-basic');
  });

  test('workspace toggle jumps to that workspace and its sidebar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mobile: toggle is icon-only and the sidebar is a drawer — covered on desktop');
    await openPage(page, '/world/calendar');
    await page.getByRole('button', { name: /^Basic$/ }).click();
    await expect(page).toHaveURL(/\/world\/education/);
    await expect(badge(page)).toHaveText('BASIC');
    await page.getByRole('button', { name: /^Plus$/ }).click();
    await expect(page).toHaveURL(/\/world\/console/);
    await expect(badge(page)).toHaveText('PLUS');
  });

  test('shared pages keep the current workspace', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mobile: toggle is icon-only and the sidebar is a drawer — covered on desktop');
    await openPage(page, '/world/console');
    await navLink(page, 'Home').click();
    await expect(page).toHaveURL(/\/world\/home/);
    await expect(badge(page)).toHaveText('PLUS');
  });
});

test.describe('Sign-up name (qa0, fresh account)', () => {
  test.use({ storageState: AUTH.fresh });
  test('the name typed at sign-up shows in the sidebar, and can be edited in Profile', async ({ page }) => {
    await openPage(page, '/world/console');
    await expect(page.locator('.w-sidebar-foot')).toContainText('QA0 New');
    await page.goto('/world/profile');
    const input = page.locator('#profile-name');
    await expect(input).toHaveValue('QA0 New', { timeout: 30_000 });
    await input.fill('QA0 Renamed');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('load');
    await openPage(page, '/world/console');
    await expect(page.locator('.w-sidebar-foot')).toContainText('QA0 Renamed', { timeout: 30_000 });
  });
});

test.describe('Pro account', () => {
  test.use({ storageState: AUTH.pro });

  test('Pro workspace lists only Pro tabs', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/pro?tab=digest');
    await expect(badge(page)).toHaveText('PRO');
    await expectOnly(page, PRO_ITEMS, [...PLUS_ITEMS, ...BASIC_ITEMS]);
    await snap(page, info, 'sidebar-pro');
    g.assertClean();
  });

  test('old Pro calendar link lands on the shared Calendar in the Plus workspace', async ({ page }) => {
    await openPage(page, '/world/pro?tab=digest');
    await page.goto('/world/pro?tab=calendar');
    await expect(page).toHaveURL(/\/world\/calendar/, { timeout: 30_000 });
    await expect(badge(page)).toHaveText('PLUS');
    await expect(navLink(page, 'Calendar')).toBeVisible();
  });

  test('Pro account on the PLUS Watchlist sees the Plus version (spec v1.6)', async ({ page }, info) => {
    await openPage(page, '/world/watchlist');
    await expect(badge(page)).toHaveText('PLUS');
    await expect(page.getByRole('heading', { name: /Watchlist Plus/ })).toBeVisible();
    await expect(page.getByText('Also Worth Watching')).toHaveCount(0);
    await snap(page, info, 'watchlist-plus-for-pro-account');
  });
});
