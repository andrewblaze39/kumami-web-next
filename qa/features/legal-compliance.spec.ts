/**
 * QA — cookie banner and legal links.
 * Cookie banner (analytics only after Accept), Terms + Cookie settings links on the
 * gate, footer and shell. 15 Oct 2026 (to-do 5227a4b7): the invented legal text is
 * gone — the Terms are the team's original text from Firestore
 * (app_config/terms_and_conditions), there is no Privacy page, and no made-up
 * "you agree / 18+ / refunds / not financial advice" lines.
 *
 * Analytics only runs in a production build, so the "no Google Analytics before
 * Accept" check is only meaningful against `next start` (QA_PORT=…).
 */
import { expect, test, type Page } from '@playwright/test';
import { AUTH, openPage, snap } from '../helpers';
import { CONSENT_STORAGE_KEY } from '../../src/lib/consent';

const GA = /google-analytics\.com|googletagmanager\.com/;
const banner = (page: Page) => page.getByRole('region', { name: 'Cookie choices' });
const storedConsent = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), CONSENT_STORAGE_KEY);

test.describe('Cookie banner (logged out)', () => {
  test('shows on first visit, loads no analytics, Reject is remembered', async ({ page }, info) => {
    const gaHits: string[] = [];
    page.on('request', (r) => { if (GA.test(r.url())) gaHits.push(r.url()); });
    await page.goto('/');
    await expect(banner(page)).toBeVisible();
    await expect(banner(page).getByRole('link')).toHaveCount(0);
    await snap(page, info, 'legal-banner-gate');
    await page.waitForLoadState('networkidle');
    expect(gaHits, 'Google Analytics must not load before a choice').toEqual([]);

    await banner(page).getByRole('button', { name: 'Reject analytics' }).click();
    await expect(banner(page)).toBeHidden();
    expect(await storedConsent(page)).toMatchObject({ analytics: false, version: 1 });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(banner(page)).toBeHidden();
    expect(gaHits, 'Google Analytics must not load after Reject').toEqual([]);
  });

  test('Accept is remembered; Cookie settings reopens the banner', async ({ page }) => {
    await page.goto('/');
    await banner(page).getByRole('button', { name: 'Accept analytics' }).click();
    await expect(banner(page)).toBeHidden();
    expect(await storedConsent(page)).toMatchObject({ analytics: true, version: 1 });

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Kumami World' })).toBeVisible();
    await expect(banner(page)).toBeHidden();
    await page.locator('.w-gate-legal').getByRole('button', { name: 'Cookie settings' }).click();
    await expect(banner(page)).toBeVisible();
    await banner(page).getByRole('button', { name: 'Reject analytics' }).click();
    expect(await storedConsent(page)).toMatchObject({ analytics: false });
  });

  test('gate footer links to Terms; no Privacy link', async ({ page }) => {
    await page.goto('/');
    const legal = page.locator('.w-gate-legal');
    await expect(legal.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    await expect(legal.getByRole('link', { name: /Privacy/ })).toHaveCount(0);
  });

  test('sign-up form has no made-up legal line', async ({ page }, info) => {
    await page.goto('/');
    await banner(page).getByRole('button', { name: 'Reject analytics' }).click();
    await page.getByRole('button', { name: /sign up/i }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Create your account' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.w-auth-legal')).toHaveCount(0);
    await expect(dialog).not.toContainText(/18 or older|financial advice|Privacy Policy/);
    await snap(page, info, 'legal-signup');
  });
});

test.describe('Privacy page removed', () => {
  test('/privacy and /world/privacy are 404s; sitemap lists only the landing page', async ({ request }) => {
    expect((await request.get('/privacy')).status()).toBe(404);
    expect((await request.get('/world/privacy')).status()).toBe(404);
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).not.toContain('/privacy');
    expect(xml).not.toContain('/terms');
  });
});

test.describe('Terms of Service (public) — the original text', () => {
  test('readable without an account, loaded from app_config/terms_and_conditions', async ({ page }, info) => {
    const res = await page.goto('/terms');
    expect(res?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/terms');
    await expect(page).toHaveTitle('Terms of Service — Kumami World');
    await expect(page.getByRole('heading', { level: 1, name: 'Terms & Conditions' })).toBeVisible();
    const body = page.locator('.markdown-content');
    await expect(body).toContainText('Terms and Conditions – Kumami.World');
    await expect(body).toContainText('Last Updated');
    await expect(page.locator('main, body')).not.toContainText(/Missing Firestore document|currently unavailable/);
    await expect(page.locator('.k-legal')).toHaveCount(0);
    await expect(page.locator('footer').getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    await expect(page.locator('footer').getByRole('link', { name: /Privacy/ })).toHaveCount(0);
    await banner(page).getByRole('button', { name: 'Reject analytics' }).click();
    await snap(page, info, 'legal-terms-public');
  });
});

test.describe('In the shell (qa1, free)', () => {
  test.use({ storageState: AUTH.plus });

  test('every page ends with Terms + Cookie settings links and no made-up disclaimer', async ({ page }, info) => {
    for (const path of ['/world/news', '/world/console', '/world/education']) {
      await openPage(page, path);
      const foot = page.locator('.w-shell-legal');
      await expect(foot.getByRole('link', { name: 'Terms' }), path).toHaveAttribute('href', '/world/terms');
      await expect(foot.getByRole('button', { name: 'Cookie settings' })).toBeVisible();
      await expect(foot.getByRole('link', { name: /Privacy/ })).toHaveCount(0);
      await expect(foot).not.toContainText('financial');
    }
    await page.locator('.w-shell-legal').scrollIntoViewIfNeeded();
    await snap(page, info, 'legal-shell-footer');
  });

  test('/world/terms renders the original Terms in the shell', async ({ page }, info) => {
    await openPage(page, '/world/terms');
    await expect(banner(page)).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'Terms & Conditions' })).toBeVisible();
    await expect(page.locator('.markdown-content')).toContainText('Terms and Conditions – Kumami.World');
    await snap(page, info, 'legal-terms-shell');
  });

  test('Subscribe note has no made-up refund or agreement line', async ({ page }) => {
    await openPage(page, '/world/subscribe');
    const note = page.locator('.w-bill-note');
    await expect(note).toContainText('Prices in USD.');
    await expect(note).not.toContainText(/refund|By paying you agree|Privacy/i);
  });

  test('brand menu links to Terms; no Privacy Policy', async ({ page, isMobile }) => {
    test.skip(isMobile, 'brand menu lives in the sidebar drawer on phones');
    await openPage(page, '/world/news');
    await page.locator('.w-brand').click();
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/world/terms');
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveCount(0);
  });
});
