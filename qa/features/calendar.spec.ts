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
import { admin } from '../personas';

type Ev = { id: string; type: string; title: string; ts: string; impact: string; assets: string[]; source?: string };

const chips = (page: Page) => page.locator('.w-cal-cell-event');

async function dismissPopupIfAny(page: Page) {
  const dismiss = page.getByRole('dialog').getByRole('button', { name: /dismiss/i });
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
}

test.afterAll(async () => {
  await deleteQaDocs('pro_calendar', 't', [`${QA_PREFIX} Round-trip`, `${QA_PREFIX} Draft must stay hidden`]);
});

test.describe('Calendar — CoinGlass feeds: OFF by default, admin switches (QA3 ↔ QA1)', () => {
  test.describe.configure({ mode: 'serial' });

  async function setSwitch(browser: import('@playwright/test').Browser, name: string, on: boolean) {
    const ctx = await browser.newContext({ storageState: AUTH.admin });
    const page = await ctx.newPage();
    await openPage(page, '/admin/pro-calendar', { ready: 'text=Automatic feeds' });
    const sw = page.getByRole('switch', { name });
    if ((await sw.getAttribute('aria-checked')) !== String(on)) await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', String(on));
    await expect(sw).toBeEnabled(); // save confirmed by the server ("Saving…" gone)
    // …and really stored (closing the tab before the write lands would lose it).
    const field = name.startsWith('Macro') ? 'macroFeed' : 'unlockFeed';
    await expect.poll(async () => (await admin().db.collection('pro_settings').doc('calendar').get()).get(field) === true, { timeout: 20_000 }).toBe(on);
    await expect(page.getByText(new RegExp(`${name.replace(/[()]/g, '.')} — ${on ? 'ON' : 'OFF'}`))).toBeVisible();
    await ctx.close();
  }

  test.afterAll(async ({ browser }) => {
    // Andrew wants both feeds OFF — always leave them OFF.
    await setSwitch(browser, 'Macro events (CoinGlass)', false).catch(() => {});
    await setSwitch(browser, 'Token unlocks (CoinGlass)', false).catch(() => {});
  });

  test('both feeds OFF → no CoinGlass events anywhere in the payload', async ({ browser }) => {
    await setSwitch(browser, 'Macro events (CoinGlass)', false);
    await setSwitch(browser, 'Token unlocks (CoinGlass)', false);
    const ctx = await browser.newContext({ storageState: AUTH.plus });
    const page = await ctx.newPage();
    await openPage(page, '/world/calendar');
    const { status, body } = await apiAsUser<{ events: Ev[]; feeds?: { macroFeed: boolean; unlockFeed: boolean } }>(page, '/api/market/calendar');
    expect(status).toBe(200);
    expect(body.feeds).toEqual({ macroFeed: false, unlockFeed: false });
    expect(body.events.filter((e) => e.source === 'feed'), 'feed events leaked while switched off').toHaveLength(0);
    await expect(page.getByText('Key dates and events picked by the Kumami team.')).toBeVisible();
    await ctx.close();
  });

  test('macro switch ON → QA1 sees macro events (sane payload, filters, month nav)', async ({ browser }, info) => {
    await setSwitch(browser, 'Macro events (CoinGlass)', true);
    const ctx = await browser.newContext({ storageState: AUTH.plus });
    const page = await ctx.newPage();
    const g = guard(page);
    await openPage(page, '/world/calendar');
    const { body } = await apiAsUser<{ events: Ev[]; updatedAt: string }>(page, '/api/market/calendar');
    const ev = body.events;
    expect(ev.filter((e) => e.type === 'macro').length).toBeGreaterThan(50);
    expect(ev.filter((e) => e.type === 'unlock' && e.source === 'feed'), 'unlocks must stay off').toHaveLength(0);
    expect(new Set(ev.map((e) => e.id)).size, 'duplicate event ids').toBe(ev.length);
    for (const e of ev) {
      expect(Number.isNaN(Date.parse(e.ts)), `bad ts on ${e.id}`).toBe(false);
      expect(['HIGH', 'MED', 'LOW']).toContain(e.impact);
    }
    expect(ev.filter((e) => Date.parse(e.ts) > Date.now()).length, 'no upcoming macro events').toBeGreaterThan(10);

    await page.reload();
    await openPage(page, '/world/calendar');
    await dismissPopupIfAny(page);
    await expectSaneText(page);
    await expect(chips(page).first()).toBeVisible();
    await page.getByRole('button', { name: 'MED', exact: true }).click();
    await page.getByRole('button', { name: 'LOW', exact: true }).click();
    const highTitles = await chips(page).evaluateAll((els) => els.map((e) => e.getAttribute('title') ?? ''));
    expect(highTitles.length).toBeGreaterThan(0);
    for (const t of highTitles) expect(t).toMatch(/, HIGH\)/);
    await snap(page, info, 'calendar-macro-on-high-only');
    const label = page.locator('.w-cal-month-label');
    const start = await label.innerText();
    await page.getByRole('button', { name: 'Next month' }).click();
    await expect(label).not.toHaveText(start);
    await page.getByRole('button', { name: 'Previous month' }).click();
    await expect(label).toHaveText(start);
    g.assertClean();
    await ctx.close();
  });

  test('macro switch back OFF → events disappear again', async ({ browser }) => {
    await setSwitch(browser, 'Macro events (CoinGlass)', false);
    const ctx = await browser.newContext({ storageState: AUTH.plus });
    const page = await ctx.newPage();
    await openPage(page, '/world/calendar');
    const { body } = await apiAsUser<{ events: Ev[] }>(page, '/api/market/calendar');
    expect(body.events.filter((e) => e.source === 'feed')).toHaveLength(0);
    await ctx.close();
  });
});

test.describe('Calendar — admin round trip (QA3 admin authors, QA1 free user views)', () => {
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
    await form.locator('textarea').fill('Temporary round-trip event — deleted automatically.');
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
    const ctx = await browser.newContext({ storageState: AUTH.admin });
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
    await expect(page.getByRole('dialog', { name: 'High-impact event tomorrow' })).toContainText(title, { timeout: 60_000 });
    await snap(page, info, 'calendar-d1-popup');
    expect(await calendarHas(page, title)).toBe(1);
    const chip = chips(page).filter({ hasText: title });
    await expect(chip).toContainText('★');
    await expect(chip).toHaveAttribute('title', /Project · Kumami, HIGH/);
    expect(await calendarHas(page, draftTitle)).toBe(0);

    // Console's "Needs your attention today" popup lists it too.
    // (On a first visit the guided tour opens at the same time — target the popup by name.)
    await page.goto('/world/console');
    await expect(page.getByRole('dialog', { name: 'Needs your attention today' })).toContainText(title, { timeout: 60_000 });
    await ctx.close();
  });

  test('admin edit shows up, delete removes it', async ({ browser }) => {
    const admin = await browser.newContext({ storageState: AUTH.admin });
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
