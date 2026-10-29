/**
 * Evidence screenshots for v1.18 (build version from Rachelle's v1.17 + Andrew's 29 Oct points).
 * Saved to docs/qa/evidence/v1.18/<item>-<name>.jpg plus manifest.json (item, file, caption).
 * Items: R<n> = Rachelle's v1.17 asks (release notes Part 1), A<n> = Andrew's added points and
 * other changes (Part 2). Best effort per shot: a missing element is recorded, never fails the run.
 * kumami-dev only. [TEST] content is created here and deleted afterwards.
 *
 *   QA_PORT=3301 npx playwright test qa/features/v118-evidence.spec.ts --project=desktop [-g <group>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, type Locator, type Page } from '@playwright/test';
import { AUTH, apiAsUser, dismissOverlays, openPage } from '../helpers';
import { deleteQaDocs, QA_PREFIX } from '../admin-data';
import { admin } from '../personas';

const DIR = path.join(__dirname, '..', '..', 'docs', 'qa', 'evidence', 'v1.18');
type Shot = { item: string; file: string | null; caption: string };
const manifest: Shot[] = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8')) as Shot[]; } catch { return []; }
})();
function record(s: Shot) {
  const i = manifest.findIndex((m) => (s.file ? m.file === s.file : m.item === s.item && m.file === null && m.caption === s.caption));
  if (i >= 0) manifest[i] = s; else manifest.push(s);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
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

// ---------------------------------------------------------------------------
// Calendar Plus / Calendar Pro / admin audience / Console mini calendar
// ---------------------------------------------------------------------------
const CAL_BOTH = `${QA_PREFIX} Kumami AMA (Plus and Pro)`;
const CAL_PRO = `${QA_PREFIX} Pro-only strategy call`;
const CAL_HIGH = `${QA_PREFIX} CPI print (HIGH)`;
const DROP = `${QA_PREFIX} Lumen airdrop`;
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

test.describe('calendar', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(async () => {
    const db = admin().db;
    const now = new Date();
    await db.collection('pro_calendar').add({ t: CAL_BOTH, date: day(2), time: '13:00', imp: 'med', d: 'Live Q&A with the **research team** — *bring questions*.', assets: 'BTC, ETH', status: 'published', audience: { plus: true, pro: true }, createdAt: now });
    await db.collection('pro_calendar').add({ t: CAL_PRO, date: day(3), time: '09:00', imp: 'high', d: 'Pro members only: positioning into the FOMC week.', assets: 'BTC', status: 'published', audience: { plus: false, pro: true }, createdAt: now });
    await db.collection('pro_calendar').add({ t: CAL_HIGH, date: day(5), time: '', imp: 'high', d: 'US CPI release.', assets: '', status: 'published', createdAt: now });
    await db.collection('pro_airdrops').add({ name: DROP, cat: 'airdrop', desc: 'Claim opens for eligible wallets.', status: 'published', tgeDate: day(4), tgeTime: '10:00', createdAt: now });
  });
  test.afterAll(async () => {
    await deleteQaDocs('pro_calendar', 't', [CAL_BOTH, CAL_PRO, CAL_HIGH]);
    await deleteQaDocs('pro_airdrops', 'name', [DROP]);
  });

  test('admin form: no Category, "Who sees this event"', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.admin, viewport: { width: 1440, height: 1100 } });
    const page = await ctx.newPage();
    await openPage(page, '/admin/pro-calendar', { ready: 'text=Scheduled events' });
    await page.getByRole('textbox', { name: 'Description' }).first().click({ timeout: 10_000 }).catch(() => {});
    const form = page.locator('form').first();
    await shot('A2', 'admin-calendar-form', form, 'Admin → Calendar: no Category field; "Who sees this event": Plus and Pro (default) or Pro only; the description box shows bold / italic / underline as you type.');
    const list = page.getByText('Scheduled events').locator('xpath=..');
    await shot('A2', 'admin-calendar-list', list, 'Admin event list: each event shows "Plus and Pro" or "Pro only".');
    await ctx.close();
  });

  test('Calendar Plus (qa1)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.plus, viewport: { width: 1440, height: 1100 } });
    const page = await ctx.newPage();
    await openPage(page, '/world/calendar');
    if (new Date(Date.now() + 5 * 86_400_000).getMonth() !== new Date().getMonth()) await page.getByRole('button', { name: 'Next month' }).click();
    const { body } = await apiAsUser<{ events: { title: string; id: string }[] }>(page, '/api/market/calendar');
    const titles = body.events.map((e) => e.title);
    await shot('A4', 'calendar-plus', page, `Calendar Plus (Plus user): colour-coded month grid, legend, day panel, no filters. API returns ${body.events.length} events; "${CAL_BOTH}" ${titles.includes(CAL_BOTH) ? 'shown' : 'MISSING'}; "${CAL_PRO}" ${titles.includes(CAL_PRO) ? 'LEAKED' : 'hidden'}; airdrop ${body.events.some((e) => e.id.startsWith('airdrop-')) ? 'LEAKED' : 'hidden'}.`);
    await shot('R01', 'calendar-plus-no-airdrops', page.locator('.w-cal-layout'), `Calendar Plus has no airdrop claim days (${body.events.filter((e) => e.id.startsWith('airdrop-')).length} airdrop events in the response).`);
    const pro = await apiAsUser(page, '/api/market/calendar?view=pro');
    record({ item: 'A2', file: null, caption: `Calendar Pro API for a Plus user: HTTP ${pro.status} (expected 403).` });
    await ctx.close();
  });

  test('Calendar Pro (qa2)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.pro, viewport: { width: 1440, height: 1100 } });
    const page = await ctx.newPage();
    await openPage(page, '/world/pro?tab=calendar');
    if (new Date(Date.now() + 5 * 86_400_000).getMonth() !== new Date().getMonth()) await page.getByRole('button', { name: 'Next month' }).click();
    const { body } = await apiAsUser<{ events: { title: string; id: string }[] }>(page, '/api/market/calendar?view=pro');
    const titles = body.events.map((e) => e.title);
    await shot('A2', 'calendar-pro', page, `Calendar Pro (Pro user): same UI; "${CAL_PRO}" ${titles.includes(CAL_PRO) ? 'shown with a PRO tag' : 'MISSING'}; airdrop "${DROP}" ${titles.some((t) => t.includes('Lumen')) ? 'shown' : 'MISSING'}.`);
    const dropCell = page.locator('.w-cal-cell').filter({ has: page.locator('.w-cal-cell-event', { hasText: 'Lumen' }) }).first();
    await dropCell.click().catch(() => {});
    await shot('A6', 'calendar-pro-airdrop-day', page.locator('.w-cal-day'), 'Calendar Pro day panel for the airdrop claim day: purple "Airdrop" tag + PRO tag.');
    const proCell = page.locator('.w-cal-cell').filter({ has: page.locator('.w-cal-cell-event', { hasText: 'Pro-only' }) }).first();
    await proCell.click().catch(() => {});
    await shot('A2', 'calendar-pro-only-event', page.locator('.w-cal-day'), `Day panel for the "Pro only" event: PRO tag; description keeps its formatting.`);
    const plusView = await apiAsUser<{ events: { title: string; id: string }[] }>(page, '/api/market/calendar');
    record({ item: 'A6', file: null, caption: `Pro user on Calendar Plus: ${plusView.body.events.filter((e) => e.id.startsWith('airdrop-')).length} airdrops (expected 0); Pro-only event ${plusView.body.events.some((e) => e.title === CAL_PRO) ? 'LEAKED' : 'hidden'}.` });
    const nav = page.locator('#w-sidebar');
    await shot('A2', 'pro-menu-calendar-pro', nav, 'Pro menu → Tools has "Calendar Pro".');
    await ctx.close();
  });

  test('Console mini calendar (qa1)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.plus, viewport: { width: 1440, height: 1100 } });
    const page = await ctx.newPage();
    await openPage(page, '/world/console');
    await dismissOverlays(page);
    await shot('A3', 'console-mini-calendar', page.locator('[data-tour="calendar-preview"]'), 'Plus Market Console: mini month calendar (today highlighted, a coloured dot per event kind) with the next 3 events, instead of the "next 7 days" list.');
    await ctx.close();
  });
});
