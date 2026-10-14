/**
 * QA — legal / compliance pass (to-do d5870b2d, 14 Oct 2026).
 * Cookie banner (analytics only after Accept), public Privacy Policy, legal links
 * on the gate, sign-up, footer, shell and Subscribe page, and the shell-wide
 * "not financial advice" footer. Terms of Service rewrite (to-do 35775685): 18+,
 * refunds, referral rules, sanctions, AI output, copyright contact, in code.
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
    await expect(banner(page).getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy#cookies');
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

  test('gate footer links to Terms and Privacy', async ({ page }) => {
    await page.goto('/');
    const legal = page.locator('.w-gate-legal');
    await expect(legal.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    await expect(legal.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
  });

  test('sign-up form says you agree to the Terms and Privacy Policy', async ({ page }, info) => {
    await page.goto('/');
    await banner(page).getByRole('button', { name: 'Reject analytics' }).click();
    await page.getByRole('button', { name: /sign up/i }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Create your account' });
    const line = dialog.locator('.w-auth-legal');
    await expect(line).toContainText('By signing up you agree to our');
    await expect(line).toContainText('18 or older');
    await expect(line).toContainText('not financial advice');
    await expect(line.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    await expect(line.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    await snap(page, info, 'legal-signup');
  });
});

test.describe('Privacy Policy (public)', () => {
  test('readable without an account, with every section and provider', async ({ page }, info) => {
    const res = await page.goto('/privacy');
    expect(res?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/privacy');
    await expect(page).toHaveTitle('Privacy Policy — Kumami World');
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
    for (const h of ['What we collect', 'Who we share it with', 'Cookies and local storage', 'Your rights', 'Children']) {
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(h) })).toBeVisible();
    }
    const table = page.locator('.k-legal table');
    for (const p of ['Stripe', 'NOWPayments', 'Google Gemini', 'Alchemy', 'Google Analytics for Firebase']) {
      await expect(table).toContainText(p);
    }
    await expect(page.locator('.k-legal')).not.toContainText(/undefined|NaN|\[object Object\]/);
    // Footer carries Terms, Privacy and Cookie settings.
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    await expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    await banner(page).getByRole('button', { name: 'Reject analytics' }).click();
    await page.locator('.k-legal').getByRole('button', { name: 'Cookie settings' }).click();
    await expect(banner(page)).toBeVisible();
    await snap(page, info, 'legal-privacy-public');
  });

  test('sitemap lists /privacy and /terms', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('<loc>https://kumami.world/privacy</loc>');
    expect(xml).toContain('<loc>https://kumami.world/terms</loc>');
  });
});

test.describe('Terms of Service (public)', () => {
  test('readable without an account, with the 14 Oct 2026 decisions', async ({ page }, info) => {
    const res = await page.goto('/terms');
    expect(res?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/terms');
    await expect(page).toHaveTitle('Terms of Service — Kumami World');
    const terms = page.locator('.k-legal');
    await expect(terms.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible();
    await expect(terms).toContainText('Last updated: 14 October 2026');
    for (const h of ['Who can use Kumami', 'Not financial advice', 'Kuma and other AI features', 'auto-renewal', 'Refunds',
      'Sanctions', 'Referral program', 'Acceptable use', 'Copyright complaints', 'Suspension', 'liability', 'Governing law', 'Contact']) {
      await expect(terms.getByRole('heading', { level: 2, name: new RegExp(h) }), h).toBeVisible();
    }
    await expect(terms).toContainText('at least 18 years old');
    await expect(terms).not.toContainText('17 years');
    await expect(terms).toContainText("Once a paid period has started we don't give refunds");
    // Prices and referral amounts come from src/lib/billing/plans.ts.
    await expect(terms).toContainText('$19.99 for 30 days');
    await expect(terms).toContainText('$199.99 for 365 days');
    await expect(terms).toContainText('$1.00 for a Monthly payment or $10.00 for a Yearly one');
    await expect(terms).toContainText('30 or 365 days of Pro');
    // Words must not run together around the {values} (a JSX whitespace bug once hid these spaces).
    await expect(terms).not.toContainText(/\d(days|for)|[\]a-z]\(&?"?Kumami/);
    await expect(terms).toContainText('answers can be wrong');
    await expect(terms).toContainText('comprehensive sanctions');
    await expect(terms).not.toContainText(/undefined|NaN|\[object Object\]/);
    await expect(terms.getByRole('link', { name: 'Privacy Policy' }).first()).toHaveAttribute('href', '/privacy');
    await expect(page.locator('footer').getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    await banner(page).getByRole('button', { name: 'Reject analytics' }).click();
    await snap(page, info, 'legal-terms-public');
    await terms.getByRole('heading', { name: /Refunds/ }).scrollIntoViewIfNeeded();
    await snap(page, info, 'legal-terms-refunds');
  });

  test('Terms and Privacy show the same company details', async ({ page }) => {
    await page.goto('/privacy');
    const privacyContact = await page.locator('.k-legal #contact + p').innerText();
    await page.goto('/terms');
    const termsContact = await page.locator('.k-legal #contact + p').innerText();
    expect(termsContact.split(' — ')[0]).toBe(privacyContact.split(' — ')[0]);
  });
});

test.describe('In the shell (qa1, free)', () => {
  test.use({ storageState: AUTH.plus });

  test('every page ends with the not-financial-advice footer and legal links', async ({ page }, info) => {
    for (const path of ['/world/news', '/world/console', '/world/education']) {
      await openPage(page, path);
      const foot = page.locator('.w-shell-legal');
      await expect(foot, path).toContainText('is financial, investment or tax advice');
      await expect(foot.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/world/terms');
      await expect(foot.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/world/privacy');
    }
    await page.locator('.w-shell-legal').scrollIntoViewIfNeeded();
    await snap(page, info, 'legal-shell-footer');
  });

  test('saved session has no banner; /world/privacy renders in the shell', async ({ page }, info) => {
    await openPage(page, '/world/privacy');
    await expect(banner(page)).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
    await snap(page, info, 'legal-privacy-shell');
  });

  test('/world/terms renders the same Terms in the shell', async ({ page }, info) => {
    await openPage(page, '/world/terms');
    await expect(page.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible();
    await expect(page.locator('.k-legal')).toContainText('at least 18 years old');
    await expect(page.locator('.k-legal').getByRole('link', { name: 'Privacy Policy' }).first()).toHaveAttribute('href', '/privacy');
    await snap(page, info, 'legal-terms-shell');
  });

  test('Subscribe page says paying means agreeing to the Terms and Privacy Policy', async ({ page }) => {
    await openPage(page, '/world/subscribe');
    const note = page.locator('.w-bill-note');
    await expect(note).toContainText('By paying you agree to our');
    await expect(note).toContainText('non-refundable once a period has started');
    await expect(note.getByRole('link', { name: 'Refunds' })).toHaveAttribute('href', '/world/terms#refunds');
    await expect(note.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/world/terms');
    await expect(note.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/world/privacy');
  });

  test('brand menu links to Terms and Privacy', async ({ page, isMobile }) => {
    test.skip(isMobile, 'brand menu lives in the sidebar drawer on phones');
    await openPage(page, '/world/news');
    await page.locator('.w-brand').click();
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/world/privacy');
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/world/terms');
  });
});

test.describe('In the shell (qa2, Pro)', () => {
  test.use({ storageState: AUTH.pro });

  test('Pro dashboard carries the not-financial-advice footer', async ({ page }, info) => {
    await openPage(page, '/world/pro');
    await expect(page.locator('.w-shell-legal')).toContainText('Alpha Room calls');
    await page.locator('.w-shell-legal').scrollIntoViewIfNeeded();
    await snap(page, info, 'legal-pro-footer');
  });
});
