/**
 * QA — two workspaces (v1.18, Rachelle's sidebar): Basic (the old Basic and Plus
 * merged, free) and Pro. Each sidebar shows only its own workspace, in Rachelle's
 * order and names; the workspace follows the page; switching jumps to that
 * workspace's first page (Basic → Console, Pro → Console Pro). Home moved to the
 * logo menu. Settings is in both sidebars and keeps the current workspace.
 */
import { expect, test, type Page } from '@playwright/test';
import { AUTH, guard, openPage, snap } from '../helpers';

const sidebar = (page: Page) => page.locator('#w-sidebar');
const badge = (page: Page) => page.locator('.w-mode-badge');
const navLink = (page: Page, name: string) => sidebar(page).getByRole('link', { name, exact: true });
const navOrder = (page: Page) => sidebar(page).locator('nav .w-nav-item span:not(.w-nav-lock)').allInnerTexts();

const BASIC_ITEMS = [
  'Console', 'Market Pulse', 'Flow Radar', 'Fear & Greed', 'Calendar', 'Watchlist',
  'News Portal', 'My Journey', 'My Courses', 'Cryptopedia', 'AI Labs', 'Games', 'Settings',
];
const PRO_ITEMS = [
  'Console Pro', 'Following & Alerts',
  'Market Pulse Pro', 'Flow Radar Pro', 'Real-Time News', 'Alpha Room', 'Calendar Pro', 'Kumami Research',
  'AI Portfolio Manager', 'Crypto Address Tracker', 'Market Cap Comparison', 'Watchlist', 'Security Scanner', 'Airdrops & Whitelist',
  'Events & Announcements', 'Settings',
];
const RETIRED = ['Home', 'On-Chain Insights', 'Flow Radar Plus', 'Watchlist Plus', 'Daily Digest', 'Spot Pulse Pro', 'Watchlist Pro', 'AI Portfolio', 'Market Analysis', 'Kuma AI Chat'];

test.describe('Basic workspace (free account)', () => {
  test.use({ storageState: AUTH.plus });

  test('one Basic sidebar in Rachelle’s order, no tier words, no Home', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/console');
    await expect(badge(page)).toHaveText('BASIC');
    expect(await navOrder(page)).toEqual(BASIC_ITEMS);
    for (const n of RETIRED) await expect(navLink(page, n), `"${n}" should be gone`).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Console' })).toBeVisible();
    await snap(page, info, 'sidebar-basic');
    g.assertClean();
  });

  test('every free page puts you in the Basic workspace', async ({ page }) => {
    for (const p of ['/world/news', '/world/education?tab=journey', '/world/calendar', '/world/flow-radar', '/world/fear-greed', '/world/watchlist', '/world/onchain']) {
      await openPage(page, p);
      await expect(badge(page), p).toHaveText('BASIC');
    }
  });

  test('the switch has two workspaces; Basic opens Console', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mobile: the sidebar is a drawer — covered on desktop');
    await openPage(page, '/world/news');
    const sw = page.locator('.w-mode-switch button');
    await expect(sw).toHaveText(['Basic', 'Pro']);
    await expect(page.getByRole('button', { name: /^Plus$/ })).toHaveCount(0);
  });

  test('Home is in the logo menu and keeps the workspace', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mobile: the sidebar is a drawer — covered on desktop');
    await openPage(page, '/world/console');
    await page.locator('.w-brand').click();
    await page.locator('.w-brand-menu').getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/world\/home/);
    await expect(badge(page)).toHaveText('BASIC');
  });

  test('page names drop "Plus"', async ({ page }) => {
    await openPage(page, '/world/flow-radar');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^\s*Flow Radar\s*$/);
    await openPage(page, '/world/watchlist');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^\s*Watchlist\s*$/);
    await openPage(page, '/world/onchain');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Market Pulse/);
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

  test('Pro sidebar in Rachelle’s order and names', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/pro?tab=digest');
    await expect(badge(page)).toHaveText('PRO');
    expect(await navOrder(page)).toEqual(PRO_ITEMS);
    await expect(sidebar(page).locator('.w-nav-label-btn')).toHaveText(['News & Signals', 'Tools']);
    await snap(page, info, 'sidebar-pro');
    g.assertClean();
  });

  test('Pro opens Console Pro; Settings keeps the Pro workspace', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mobile: the sidebar is a drawer — covered on desktop');
    await openPage(page, '/world/console');
    await page.locator('.w-mode-switch').getByRole('button', { name: /Pro/ }).click();
    await expect(page).toHaveURL(/\/world\/pro\?tab=digest/);
    await expect(page.getByRole('heading', { level: 1, name: /Console Pro/ })).toBeVisible();
    await navLink(page, 'Settings').click();
    await expect(page).toHaveURL(/\/world\/settings/);
    await expect(badge(page)).toHaveText('PRO');
  });

  test('Pro account on the Basic Watchlist sees the cut-down version (spec v1.6)', async ({ page }, info) => {
    await openPage(page, '/world/watchlist');
    await expect(badge(page)).toHaveText('BASIC');
    await expect(page.getByText('Also Worth Watching')).toHaveCount(0);
    await snap(page, info, 'watchlist-basic-for-pro-account');
  });
});
