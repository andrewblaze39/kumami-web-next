/**
 * QA — website polish batch A (Andrew, 11 Oct 2026; "20 things that make a site real").
 * Share image, robots.txt, sitemap.xml, web manifest, branded 404, public Terms,
 * page titles, the landing page's above-the-fold CTA on phones, and the roadmap cleanup.
 */
import { expect, test } from '@playwright/test';
import { AUTH, openPage, snap } from '../helpers';

test.describe('Public site basics (logged out)', () => {
  test('share image exists and is a 1200×630 PNG', async ({ request }) => {
    const r = await request.get('/og-default.png');
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('image/png');
    const b = await r.body();
    expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  test('every page points link previews at the share image', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute('content', /og-default\.png/);
    await expect(page.locator('meta[name="twitter:image"]').first()).toHaveAttribute('content', /og-default\.png/);
  });

  test('robots.txt allows the site, blocks admin/api/app shell, links the sitemap', async ({ request }) => {
    const r = await request.get('/robots.txt');
    expect(r.status()).toBe(200);
    const t = await r.text();
    expect(t).toMatch(/Allow: \//);
    for (const d of ['/admin', '/api/', '/world/']) expect(t).toContain(`Disallow: ${d}`);
    expect(t).toContain('Sitemap: https://kumami.world/sitemap.xml');
  });

  test('sitemap.xml lists the public landing page', async ({ request }) => {
    const r = await request.get('/sitemap.xml');
    expect(r.status()).toBe(200);
    expect(await r.text()).toContain('<loc>https://kumami.world</loc>');
  });

  test('web manifest has name, colours and icons that load', async ({ request }) => {
    const r = await request.get('/manifest.webmanifest');
    expect(r.status()).toBe(200);
    const m = await r.json();
    expect(m.name).toBe('Kumami World');
    expect(m.theme_color).toBe('#00c2c7');
    for (const icon of m.icons) expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  });

  test('unknown URLs get the branded 404 (status 404)', async ({ page }, info) => {
    const res = await page.goto('/this-page-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'This page wandered off the chain.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to Kumami World' })).toHaveAttribute('href', '/');
    await expect(page).toHaveTitle('Page not found — Kumami World');
    await snap(page, info, 'site-polish-404');
  });

  test('Terms of Service is readable without an account', async ({ page }, info) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    expect(new URL(page.url()).pathname, 'Terms must not redirect into the login-only shell').toBe('/terms');
    await expect(page).toHaveTitle('Terms of Service — Kumami World');
    await expect(page.locator('body')).toContainText(/terms/i);
    await snap(page, info, 'site-polish-terms');
  });

  test('landing page: the Sign Up CTA is above the fold', async ({ page }, info) => {
    await page.goto('/');
    const cta = page.getByRole('button', { name: /Sign Up/ }).first();
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    const vh = page.viewportSize()!.height;
    expect(box!.y + box!.height, 'CTA must be visible without scrolling').toBeLessThanOrEqual(vh);
    await snap(page, info, 'site-polish-gate');
  });
});

test.describe('Page titles (signed in)', () => {
  test.use({ storageState: AUTH.plus });
  for (const [path, title] of [
    ['/world/console', 'Market Intelligence — Kumami World'],
    ['/world/calendar', 'Calendar — Kumami World'],
    ['/world/onchain', 'On-Chain Insights — Kumami World'],
    ['/world/flow-radar', 'Flow Radar — Kumami World'],
    ['/world/fear-greed', 'Fear & Greed — Kumami World'],
    ['/world/watchlist', 'Watchlist — Kumami World'],
    ['/world/settings', 'Settings — Kumami World'],
  ] as const) {
    test(`${path} has its own title and description`, async ({ page }) => {
      await openPage(page, path);
      await expect(page).toHaveTitle(title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{20,}/);
    });
  }
});

test.describe('Admin roadmap cleanup', () => {
  test.use({ storageState: AUTH.admin });
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('scrapped items are gone (also from a saved roadmap); new items show', async ({ page }, info) => {
    await page.goto('/admin/roadmap');
    // Simulate a browser that saved the old roadmap before the cleanup.
    await page.evaluate(() => {
      localStorage.setItem('kumami-roadmap-v1', JSON.stringify({
        version: 1, updatedAt: '2026-05-18', seededIds: ['kk-1'],
        categories: [
          { id: 'news-portal', name: 'News Portal', items: [{ id: 'np-1', text: 'Education kebawah di remove', deadline: '2026-05-19', done: false }] },
          { id: 'kuma-chatroom', name: 'Pro · Kuma AI Chatroom', items: [{ id: 'kc-2', text: 'Kuma AI chatroom revamp to look like Claude or Elfa AI', deadline: '2026-05-24', done: false }] },
          { id: 'mine', name: 'My own list', items: [{ id: 'x-1', text: 'Something I added myself', deadline: null, done: false }] },
          { id: 'kuma-ai-knowledge', name: 'Kuma AI · Knowledge', items: [{ id: 'kk-1', text: 'Refresh Kuma AI knowledge PDF', deadline: null, done: false }] },
        ],
      }));
    });
    await page.reload();
    await expect(page.getByText('Website polish · launch checklist').first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/robots\.txt \+ sitemap\.xml/).first()).toBeVisible();
    await expect(page.getByText(/optional logo upload in the admin form/).first()).toBeVisible();
    await expect(page.getByText('Refresh Kuma AI knowledge PDF').first()).toBeVisible(); // kept
    await expect(page.getByText('Something I added myself').first()).toBeVisible(); // admin's own items untouched
    await expect(page.getByText('Education kebawah di remove')).toHaveCount(0);
    await expect(page.getByText(/look like Claude or Elfa AI/)).toHaveCount(0);
    await expect(page.getByText('News Portal', { exact: true })).toHaveCount(0);
    await snap(page, info, 'site-polish-roadmap');
  });
});
