/**
 * QA — Calendar v1.15 (Rachelle Plus §5): Token sale / TGE admin rules, airdrop TGE dates,
 * HIGH + MED by default. qa3 authors in /admin, qa1 checks /world/calendar.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { AUTH, apiAsUser, guard, openPage, snap } from '../helpers';
import { deleteQaDocs, QA_PREFIX } from '../admin-data';
import { admin } from '../personas';

const SALE = `${QA_PREFIX} Acme token sale`;
const LOW = `${QA_PREFIX} Low impact note`;
const DROP = `${QA_PREFIX} Acme airdrop`;
type Ev = { id: string; title: string; impact: string; description: string; link?: string; category?: string };

const field = (scope: Page | Locator, label: string) =>
  scope.locator(`xpath=.//div[label[normalize-space(.)="${label}"]]`).locator('input:not([type="checkbox"]), textarea, select').first();

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

test.afterAll(async () => {
  await deleteQaDocs('pro_calendar', 't', [SALE, LOW]);
  await deleteQaDocs('pro_airdrops', 'name', [DROP]);
});

test.describe.configure({ mode: 'serial' });

test('admin: a token sale needs every field; then it publishes', async ({ browser }, info) => {
  const ctx = await browser.newContext({ storageState: AUTH.admin });
  const page = await ctx.newPage();
  await openPage(page, '/admin/pro-calendar', { ready: 'text=Automatic feeds' });
  await field(page, 'Title').fill(SALE);
  await field(page, 'Date').fill(day(3));
  await field(page, 'Category').selectOption('Token sale / TGE');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByText(/A token sale needs: ticker, time \(UTC\), venue, raise or FDV, link\./)).toBeVisible();
  await field(page, 'Time in UTC (optional — blank = all day)').fill('14:00');
  await field(page, 'Ticker').fill('ACME');
  await field(page, 'Venue (launchpad / exchange)').fill('Binance Launchpool');
  await field(page, 'Raise or FDV').fill('$12M raise');
  await field(page, 'Official link').fill('https://example.com/acme');
  await field(page, 'Impact').selectOption('high');
  await page.getByText('Which impact should I pick?').click();
  await expect(page.getByText(/Binance or Coinbase spot listings/)).toBeVisible();
  await snap(page, info, 'v115-admin-token-sale');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByText('Event published!')).toBeVisible();
  // A LOW team event, to check the default filter.
  await field(page, 'Title').fill(LOW);
  await field(page, 'Date').fill(day(3));
  await field(page, 'Category').selectOption('Other');
  await field(page, 'Impact').selectOption('low');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByText('Event published!')).toBeVisible();
  await ctx.close();
});

test('admin: an airdrop with a TGE / claim date', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: AUTH.admin });
  const page = await ctx.newPage();
  await openPage(page, '/admin/pro-airdrops', { ready: 'form' });
  await field(page, 'Name').fill(DROP);
  await field(page, 'Description').fill('QA airdrop with a claim date');
  await page.getByLabel('TGE / claim date').fill(day(4));
  await page.getByLabel('TGE / claim time (UTC)').fill('09:30');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect.poll(async () => (await admin().db.collection('pro_airdrops').where('name', '==', DROP).get()).size, { timeout: 20_000 }).toBe(1);
  await ctx.close();
});

test('Plus user: token sale with venue, raise and link; airdrop claim day; LOW hidden by default', async ({ browser }, info) => {
  const ctx = await browser.newContext({ storageState: AUTH.plus });
  const page = await ctx.newPage();
  const g = guard(page);
  await openPage(page, '/world/calendar');
  const { body } = await apiAsUser<{ events: Ev[] }>(page, '/api/market/calendar');
  const sale = body.events.find((e) => e.title === SALE);
  expect(sale?.description).toContain('Venue: Binance Launchpool · Raise / FDV: $12M raise');
  expect(sale?.link).toBe('https://example.com/acme');
  const drop = body.events.find((e) => e.title.startsWith(DROP));
  expect(drop).toMatchObject({ impact: 'MED', category: 'Airdrop TGE / claim' });
  expect(body.events.find((e) => e.title === LOW)?.impact).toBe('LOW');

  await expect(page.locator('.w-cal-cell-event').filter({ hasText: SALE })).toBeVisible();
  await expect(page.locator('.w-cal-cell-event').filter({ hasText: DROP })).toBeVisible();
  await expect(page.locator('.w-cal-cell-event').filter({ hasText: LOW })).toHaveCount(0);
  await page.locator('.w-flow-radar-chip', { hasText: 'LOW' }).click();
  await expect(page.locator('.w-cal-cell-event').filter({ hasText: LOW })).toBeVisible();
  await snap(page, info, 'v115-calendar-plus');
  g.assertClean();
  await ctx.close();
});
