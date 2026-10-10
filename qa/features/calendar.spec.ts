/**
 * QA — shared Calendar (/world/calendar) + admin authoring (/admin/pro-calendar).
 * Spec: Andrew's spec v1.3 Plus §5 / Pro §14 · Rachelle Kumami Website (6) §7.
 *
 * Checks: payload sanity, filters (type / impact), month navigation, the admin
 * publish → draft-hidden → edit → delete round trip as seen by a Plus user,
 * and the HIGH-impact popup on both Calendar and Console.
 */
import { expect, test, type Page } from '@playwright/test';
import { AUTH, apiAsUser, expectSaneText, guard, openPage, snap } from '../helpers';
import { deleteQaDocs, QA_PREFIX } from '../admin-data';

type Ev = { id: string; type: string; title: string; ts: string; impact: string; assets: string[]; source?: string };

const chips = (page: Page) => page.locator('.w-cal-cell-event');

async function dismissPopupIfAny(page: Page) {
  const dismiss = page.getByRole('dialog').getByRole('button', { name: /dismiss/i });
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
}

test.afterAll(async () => {
  await deleteQaDocs('pro_calendar');
});

test.describe('Calendar — Plus user', () => {
  test.use({ storageState: AUTH.plus });

  test('payload is sane and includes upcoming events', async ({ page }) => {
    await openPage(page, '/world/calendar');
    const { status, body } = await apiAsUser<{ events: Ev[]; updatedAt: string }>(page, '/api/market/calendar');
    expect(status).toBe(200);
    const ev = body.events;
    expect(ev.length).toBeGreaterThan(50);
    expect(new Set(ev.map((e) => e.id)).size, 'duplicate event ids').toBe(ev.length);
    for (const e of ev) {
      expect(Number.isNaN(Date.parse(e.ts)), `bad ts on ${e.id}`).toBe(false);
      expect(['HIGH', 'MED', 'LOW']).toContain(e.impact);
      expect(['macro', 'unlock', 'protocol']).toContain(e.type);
    }
    const upcoming = ev.filter((e) => Date.parse(e.ts) > Date.now());
    expect(upcoming.length, 'no upcoming events — macro feed window broken?').toBeGreaterThan(10);
    expect(Date.now() - Date.parse(body.updatedAt)).toBeLessThan(5 * 60_000);
  });

  test('filters and month navigation work', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/calendar');
    await dismissPopupIfAny(page);
    await expectSaneText(page);
    await expect(page.locator('.w-cal-nextup')).toBeVisible();
    await expect(chips(page).first()).toBeVisible();

    // Type filter: Token Unlocks → only unlock chips remain.
    await page.getByRole('button', { name: 'Token Unlocks' }).click();
    const unlockTitles = await chips(page).evaluateAll((els) => els.map((e) => e.getAttribute('title') ?? ''));
    for (const t of unlockTitles) expect(t.toLowerCase()).toContain('unlock');
    await page.getByRole('button', { name: 'All' }).first().click();

    // Impact filter: switch off MED and LOW → only HIGH chips remain.
    await page.getByRole('button', { name: 'MED', exact: true }).click();
    await page.getByRole('button', { name: 'LOW', exact: true }).click();
    const highTitles = await chips(page).evaluateAll((els) => els.map((e) => e.getAttribute('title') ?? ''));
    expect(highTitles.length).toBeGreaterThan(0);
    for (const t of highTitles) expect(t).toMatch(/, HIGH\)/);
    await snap(page, info, 'calendar-high-only');

    // Month navigation.
    const label = page.locator('.w-cal-month-label');
    const start = await label.innerText();
    await page.getByRole('button', { name: 'Next month' }).click();
    await expect(label).not.toHaveText(start);
    await page.getByRole('button', { name: 'Previous month' }).click();
    await expect(label).toHaveText(start);
    g.assertClean();
  });
});

test.describe('Calendar — admin round trip (Pro/admin authors, Plus user views)', () => {
  test.describe.configure({ mode: 'serial' });

  // A HIGH event ~3h from now (UTC) — inside the 24h popup window.
  const at = new Date(Date.now() + 3 * 3_600_000);
  const date = at.toISOString().slice(0, 10);
  const time = at.toISOString().slice(11, 16);
  const stamp = Date.now().toString(36);
  const title = `${QA_PREFIX} Round-trip ${stamp}`;
  const draftTitle = `${QA_PREFIX} Draft must stay hidden ${stamp}`;

  async function fillForm(page: Page, t: string, opts: { time?: string; impact?: string } = {}) {
    const form = page.locator('form').first();
    await form.locator('input').first().fill(t);
    await form.locator('input[type="date"]').fill(date);
    await form.locator('input[type="time"]').fill(opts.time ?? time);
    await form.locator('select').nth(0).selectOption(opts.impact ?? 'high');
    await form.locator('select').nth(1).selectOption('Project');
    await form.getByPlaceholder(/BTC, ETH/).fill('eth');
    await form.locator('textarea').fill('Temporary QA event — deleted automatically.');
  }

  async function calendarHas(page: Page, text: string) {
    await openPage(page, '/world/calendar');
    await dismissPopupIfAny(page);
    if (new Date(date).getUTCMonth() !== new Date().getMonth()) {
      await page.getByRole('button', { name: 'Next month' }).click();
    }
    return chips(page).filter({ hasText: text }).count();
  }

  test('admin publishes an event and saves a draft', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.pro });
    const page = await ctx.newPage();
    const g = guard(page);
    await openPage(page, '/admin/pro-calendar', { ready: 'text=Scheduled events' });
    await fillForm(page, title);
    await page.getByRole('button', { name: /^Publish$/ }).click();
    await expect(page.getByText('Event published!')).toBeVisible();
    await fillForm(page, draftTitle, { impact: 'low' });
    await page.getByRole('button', { name: /^Save Draft$/ }).click();
    await expect(page.getByText('Draft saved.')).toBeVisible();
    g.assertClean();
    await ctx.close();
  });

  test('Plus user sees the published event (★, first in its day) but not the draft', async ({ browser }, info) => {
    const ctx = await browser.newContext({ storageState: AUTH.plus });
    const page = await ctx.newPage();
    // The HIGH event is within 24h and involves ETH → the D-1 popup must show it.
    await page.goto('/world/calendar');
    await expect(page.getByRole('dialog')).toContainText(title, { timeout: 60_000 });
    await snap(page, info, 'calendar-d1-popup');
    expect(await calendarHas(page, title)).toBe(1);
    const chip = chips(page).filter({ hasText: title });
    await expect(chip).toContainText('★');
    await expect(chip).toHaveAttribute('title', /Project · Kumami, HIGH/);
    expect(await calendarHas(page, draftTitle)).toBe(0);

    // Console's "Needs your attention today" popup lists it too.
    await page.goto('/world/console');
    await expect(page.getByRole('dialog')).toContainText(title, { timeout: 60_000 });
    await ctx.close();
  });

  test('admin edit shows up, delete removes it', async ({ browser }) => {
    const admin = await browser.newContext({ storageState: AUTH.pro });
    const a = await admin.newPage();
    a.on('dialog', (d) => d.accept()); // "Delete this event?" confirm
    await openPage(a, '/admin/pro-calendar', { ready: 'text=Scheduled events' });
    const row = a.locator('div.border').filter({ hasText: title }).first();
    await row.getByRole('button', { name: 'Edit' }).click();
    await a.locator('form').first().locator('input').first().fill(`${title} edited`);
    await a.getByRole('button', { name: 'Update & Publish' }).click();
    await expect(a.getByText('Event updated.')).toBeVisible();

    const viewer = await browser.newContext({ storageState: AUTH.plus });
    const v = await viewer.newPage();
    expect(await calendarHas(v, `${title} edited`)).toBe(1);

    await a.locator('div.border').filter({ hasText: `${title} edited` }).first().getByRole('button', { name: 'Delete' }).click();
    await expect(a.getByText('Event deleted.')).toBeVisible();
    expect(await calendarHas(v, title)).toBe(0);
    await admin.close();
    await viewer.close();
  });
});
