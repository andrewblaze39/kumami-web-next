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
import { admin, readPersonas } from '../personas';

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

// ---------------------------------------------------------------------------
// Following & Alerts — CMC-style alerts, checked server-side by the collector
// ---------------------------------------------------------------------------
test.describe('alerts', () => {
  test.describe.configure({ mode: 'serial' });
  const cronSecret = () => (fs.readFileSync('.env.local', 'utf8').match(/^CRON_SECRET=(.+)$/m)?.[1] ?? '').trim();
  async function clear(uid: string) {
    const db = admin().db;
    await db.collection('price_alerts').doc(uid).delete().catch(() => {});
    const n = await db.collection('notifications').where('userId', '==', uid).get();
    await Promise.all(n.docs.filter((d) => d.get('kind') === 'price_alert').map((d) => d.ref.delete()));
  }

  test('Pro user builds alerts; the collector fires one', async ({ browser }) => {
    test.setTimeout(300_000);
    const uid = readPersonas().qa2.uid!;
    await clear(uid);
    const ctx = await browser.newContext({ storageState: AUTH.pro, viewport: { width: 1440, height: 1100 } });
    const page = await ctx.newPage();
    await openPage(page, '/world/pro?tab=followhub');
    const builder = page.locator('[data-tour="fa-builder"]');
    await builder.getByLabel('Coin').fill('BTC');
    await builder.getByLabel('Alert type').selectOption('price_above');
    await builder.getByLabel('Target price').fill('1000');
    await builder.getByLabel('Frequency').selectOption('once');
    await builder.getByRole('button', { name: 'Create alert' }).click();
    await page.getByText('BTC price rises above $1,000').waitFor({ timeout: 20_000 });
    await builder.getByLabel('Coin').fill('ETH');
    await builder.getByLabel('Alert type').selectOption('pct_up_24h');
    await builder.getByLabel('Percent').fill('5');
    await builder.getByLabel('Frequency').selectOption('every');
    await builder.getByRole('button', { name: 'Create alert' }).click();
    await page.getByText('ETH up 5% in 24h').waitFor({ timeout: 20_000 });
    await shot('A5', 'alerts-builder', page, 'Following & Alerts: CMC-style builder (coin · Price rises above / drops below / up % / down % (24h) / 24h volume up · value · Once / Every time) and the two alerts created.');

    // First collector run arms both alerts. BTC is above $1,000, so its alert waits (no instant alert);
    // mark it armed as if the price had been below, then run the collector again: it must fire.
    const run = () => page.request.post('/api/v1/cron/collect', { headers: { 'x-cron-secret': cronSecret() }, data: {}, timeout: 120_000 });
    const r1 = await run();
    const doc = (await admin().db.collection('price_alerts').doc(uid).get()).data() as { alerts: { id: number; symbol: string }[] };
    const btc = doc.alerts.find((a) => a.symbol === 'BTC')!;
    await admin().db.collection('price_alerts').doc(uid).set({ state: { [String(btc.id)]: { armed: true } } }, { merge: true });
    const r2 = await run();
    const body = (await r2.json()) as { alerts?: { fired?: number; checked?: number } };
    record({ item: 'A5', file: null, caption: `Collector runs: HTTP ${r1.status()} then ${r2.status()}; second run checked ${body.alerts?.checked} alerts, fired ${body.alerts?.fired}.` });
    const toast = page.locator('.w-alert-toast');
    await toast.waitFor({ timeout: 60_000 }).catch(() => {});
    await shot('A5', 'alert-toast', page, `In-app alert on the open page: "${(await toast.innerText().catch(() => '(no toast)')).replace(/\s+/g, ' ').slice(0, 140)}".`);
    await openPage(page, '/world/pro?tab=followhub');
    await shot('A5', 'alerts-after-trigger', page, 'After the trigger: the BTC alert shows "Triggered" (Once → paused, Re-arm button) and "Recent alerts" lists it; the ETH alert keeps watching.');
    await ctx.close();
    await clear(uid);
  });

  test('alerts API is Pro-only', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.plus });
    const page = await ctx.newPage();
    await openPage(page, '/world/console');
    const r = await apiAsUser(page, '/api/v1/me/alerts');
    record({ item: 'A5', file: null, caption: `GET /api/v1/me/alerts as a Plus user: HTTP ${r.status} (expected 403 pro_required).` });
    await ctx.close();
  });
});

// ---------------------------------------------------------------------------
// Rachelle v1.17: Console confidence + Fear & Greed one index, OI flat, Flow Radar, Pro page
// ---------------------------------------------------------------------------
test.describe('rachelle', () => {
  test('Console + Fear & Greed (qa1)', async ({ browser }) => {
    test.setTimeout(300_000);
    const ctx = await browser.newContext({ storageState: AUTH.plus, viewport: { width: 1440, height: 1100 } });
    const page = await ctx.newPage();
    await openPage(page, '/world/console');
    await dismissOverlays(page);
    type C = { marketConditions: { verdict: { label: string }; confidence: number; fearGreed: number | null; fearGreedLabel: string; fearGreedColor: string }; regimeChips: { asset: string; label: string; confidence: number }[] };
    const { body: c } = await apiAsUser<C>(page, '/api/market/console');
    const { body: fg } = await apiAsUser<{ composite: { score: number; label: string; color: string }; historySource?: string; ownHistoryDays?: number }>(page, '/api/market/fear-greed');
    const mc = c.marketConditions;
    await shot('R12', 'console-regime', page.locator('[data-tour="market"]'), `Global Regime "${mc.verdict.label}" (confidence ${mc.confidence}) — one confidence rule (0 signals → Neutral · Low Signal; 1–2 → Leaning at most).`);
    await shot('R13', 'coin-chips', page.locator('[data-tour="regime"]'), `Coin chips use the same floors: ${c.regimeChips.map((x) => `${x.asset} ${x.label} (${x.confidence})`).join(' · ')}. No HYPE cap.`);
    await shot('R14', 'console-fear-greed', page.locator('[data-tour="market"]'), `Console Fear & Greed ${mc.fearGreed} "${mc.fearGreedLabel}" (${mc.fearGreedColor}) = Fear & Greed page ${fg.composite.score} "${fg.composite.label}" (${fg.composite.color}) — ${mc.fearGreed === fg.composite.score && mc.fearGreedLabel === fg.composite.label ? 'match' : 'MISMATCH'}.`);
    await openPage(page, '/world/fear-greed');
    await shot('R15', 'fear-greed-page', page, `Fear & Greed page: ${fg.composite.score} ${fg.composite.label}; bands 0–24 / 25–45 / 46–55 / 56–74 / 75–100, Fear red, Greed green.`);
    const chart = page.locator('.w-fg-chart-panel');
    await shot('R16', 'history-market-index', chart, `History chart titled "${fg.historySource === 'kumami' ? 'Kumami Fear & Greed history' : 'Market index'}" — ${fg.ownHistoryDays ?? 0}/30 days of Kumami's own score saved; Extreme Greed band from 75.`);
    const saved = await admin().db.collection('fear_greed_daily').orderBy('date', 'desc').limit(3).get();
    record({ item: 'R16', file: null, caption: `fear_greed_daily (kumami-dev) latest saved days: ${saved.docs.map((d) => `${d.id} = ${d.get('score')} ${d.get('label')}`).join(' · ') || 'none yet'}.` });
    await ctx.close();
  });

  test('On-Chain OI flat band (qa1)', async ({ browser }) => {
    test.setTimeout(300_000);
    const ctx = await browser.newContext({ storageState: AUTH.plus, viewport: { width: 1440, height: 1100 } });
    const page = await ctx.newPage();
    await openPage(page, '/world/onchain');
    for (const range of ['24h', '7d', '30d'] as const) {
      const { body } = await apiAsUser<{ panels: { oi?: { verdict: { label: string }; extra?: { flatBandPct?: number } } } }>(page, `/api/market/onchain?asset=BTC&range=${range}`);
      record({ item: 'R06', file: null, caption: `BTC ${range}: OI verdict "${body.panels?.oi?.verdict.label}", flat band ±${body.panels?.oi?.extra?.flatBandPct}%.` });
    }
    await page.getByRole('button', { name: /Show more metrics/ }).click().catch(() => {});
    const oi = page.locator('.w-oc-panel').filter({ hasText: 'Open Interest Trend' });
    await shot('R06', 'oi-panel', oi, 'Open Interest panel; its help (?) says "Flat" = OI or price moved less than ±1% (24H), ±2.5% (7D) or ±5% (30D).');
    await ctx.close();
  });

  test('Flow Radar Plus quiet state (qa1)', async ({ browser }) => {
    test.setTimeout(240_000);
    const ctx = await browser.newContext({ storageState: AUTH.plus, viewport: { width: 1440, height: 1100 } });
    const page = await ctx.newPage();
    await openPage(page, '/world/flow-radar');
    await page.getByRole('button', { name: '1H', exact: true }).click().catch(() => {});
    await page.waitForTimeout(1500);
    const feed = page.locator('[data-tour="fr-feed"]');
    await shot('R05', 'flow-radar-1h', feed, `Flow Radar Plus, 1H window: "${(await feed.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160)}".`);
    await ctx.close();
  });

  test('Pro page: cancelled trackers gone (qa1)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.plus, viewport: { width: 1440, height: 1400 } });
    const page = await ctx.newPage();
    await openPage(page, '/world/pro');
    const text = await page.locator('body').innerText();
    await shot('R18', 'pro-page', page, `Pro page for a Plus user: "Smart Money Tracker" ${/Smart Money Tracker/.test(text) ? 'STILL LISTED' : 'not listed'}, "Coin / Token Tracker" ${/Coin \/ Token Tracker/.test(text) ? 'STILL LISTED' : 'not listed'}; Calendar Pro ${/Calendar Pro/.test(text) ? 'listed' : 'missing'}.`);
    await ctx.close();
  });
});

// ---------------------------------------------------------------------------
// Rich text in admin (bold / italic / underline shown while typing) + on the site
// ---------------------------------------------------------------------------
test.describe('richtext', () => {
  const DROP_RT = `${QA_PREFIX} Rich text airdrop`;
  test.afterAll(async () => { await deleteQaDocs('pro_airdrops', 'name', [DROP_RT]); });

  test('admin editor → Pro Airdrops page', async ({ browser }) => {
    test.setTimeout(240_000);
    const ctx = await browser.newContext({ storageState: AUTH.admin, viewport: { width: 1440, height: 1100 } });
    const page = await ctx.newPage();
    await openPage(page, '/admin/pro-airdrops', { ready: 'form' });
    await page.locator('form').first().locator('input').first().fill(DROP_RT);
    const ed = page.getByRole('textbox', { name: 'Description' }).first();
    await ed.click();
    await page.keyboard.type('Claim opens ');
    await page.keyboard.press('Control+b'); await page.keyboard.type('Friday'); await page.keyboard.press('Control+b');
    await page.keyboard.type(' for ');
    await page.keyboard.press('Control+i'); await page.keyboard.type('early'); await page.keyboard.press('Control+i');
    await page.keyboard.type(' wallets, ');
    await page.keyboard.press('Control+u'); await page.keyboard.type('check eligibility'); await page.keyboard.press('Control+u');
    await shot('A1', 'admin-editor', page.locator('.rich-text-editor-wrap').first(), 'Admin text box: bold, italic and underline show as you type (toolbar B / I / U or Ctrl+B / I / U), no ** marks.');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.waitForTimeout(3000);
    const saved = await admin().db.collection('pro_airdrops').where('name', '==', DROP_RT).get();
    record({ item: 'A1', file: null, caption: `Stored description: "${saved.docs[0]?.get('desc') ?? '(not saved)'}".` });
    await ctx.close();

    const pro = await browser.newContext({ storageState: AUTH.pro, viewport: { width: 1440, height: 1100 } });
    const p2 = await pro.newPage();
    await openPage(p2, '/world/pro?tab=airdrops');
    await p2.getByText('Rich text airdrop').first().scrollIntoViewIfNeeded().catch(() => {});
    await shot('A1', 'site-airdrop', p2, 'Pro → Airdrops & Whitelist shows the same description with the bold / italic / underline.');
    await pro.close();
  });
});
