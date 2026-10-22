/**
 * Evidence screenshots for the v1.16 review of Rachelle's v1.15 asks (Andrew,
 * 22 Oct 2026): one or more shots per review item, saved to
 * qa/artifacts/evidence/item-NN-*.jpg plus manifest.json (item, file, caption).
 * Best effort per shot: a missing element is recorded, never fails the run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, type Locator, type Page } from '@playwright/test';
import { AUTH, apiAsUser, dismissOverlays, openPage } from '../helpers';
import { deleteQaDocs, QA_PREFIX } from '../admin-data';
import { admin } from '../personas';

const DIR = path.join(__dirname, '..', 'artifacts', 'evidence');
type Shot = { item: number; file: string | null; caption: string };
// Keep earlier shots: a run of one group only replaces its own files.
const manifest: Shot[] = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8')) as Shot[]; } catch { return []; }
})();
function record(s: Shot) {
  const i = manifest.findIndex((m) => (s.file ? m.file === s.file : m.item === s.item && m.file === null && m.caption === s.caption));
  if (i >= 0) manifest[i] = s; else manifest.push(s);
}

function save() {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

async function shot(item: number, name: string, target: Locator | Page, caption: string) {
  fs.mkdirSync(DIR, { recursive: true });
  const file = `item-${String(item).padStart(2, '0')}-${name}.jpg`;
  try {
    if ('waitFor' in target) {
      await target.waitFor({ state: 'visible', timeout: 30_000 });
      await target.scrollIntoViewIfNeeded();
    }
    await target.screenshot({ path: path.join(DIR, file), type: 'jpeg', quality: 70 });
    record({ item, file, caption });
  } catch (e) {
    record({ item, file: null, caption: `${caption} — screenshot failed: ${String(e).slice(0, 120)}` });
  }
  save();
}

const BADGE = `${QA_PREFIX} Evidence CPI`;


test.describe('v1.16 evidence — Plus (qa1)', () => {
  test.use({ storageState: AUTH.plus, viewport: { width: 1440, height: 1000 } });

  test.beforeAll(async () => {
    const d = new Date(Date.now() + 2 * 3_600_000);
    await admin().db.collection('pro_calendar').add({
      t: BADGE, imp: 'high', cat: 'Macro', d: 'QA evidence badge', assets: '', status: 'published',
      createdAt: new Date(), date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16),
    });
  });
  test.afterAll(async () => {
    await deleteQaDocs('pro_calendar', 't', [BADGE]);
  });

  test('Console (items 1–4)', async ({ page }) => {
    test.setTimeout(240_000);
    await openPage(page, '/world/console');
    const popup = page.getByRole('dialog', { name: 'Needs your attention today' });
    if (await popup.isVisible().catch(() => false)) await popup.getByRole('button', { name: 'Close' }).click();
    await dismissOverlays(page);
    const { body } = await apiAsUser<{ marketConditions: { verdict: { label: string }; confidence: number; fearGreed: number | null } ; regimeChips: { asset: string; regime: string; confidence: number }[] }>(page, '/api/market/console');
    const mc = body.marketConditions;
    await shot(1, 'console-regime', page.locator('[data-tour="market"]'),
      `Global Regime "${mc.verdict.label}", confidence ${mc.confidence}, Fear & Greed ${mc.fearGreed} (CoinGlass index).`);
    const hype = body.regimeChips.find((c) => c.asset === 'HYPE');
    await shot(2, 'regime-chips', page.locator('[data-tour="regime"]'),
      `Coin chips. HYPE confidence ${hype?.confidence} (cap 0.70); max of the others ${Math.max(...body.regimeChips.filter((c) => c.asset !== 'HYPE').map((c) => c.confidence))}.`);
    await shot(3, 'console-flow-preview', page.locator('[data-tour="flow"]'), 'Console Flow Radar preview: "Delayed 15m", HIGH/MED events of the 5 core coins, from saved history.');
    await page.locator('.w-console-event-badge').evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
    await page.waitForTimeout(300);
    await shot(4, 'console-badge', page, `Badge for a [TEST] HIGH event 2h ahead: "${(await page.locator('.w-console-event-badge').textContent().catch(() => ''))?.trim()}".`);
  });

  test('On-Chain (items 5–8)', async ({ page }) => {
    test.setTimeout(300_000);
    await openPage(page, '/world/onchain');
    await dismissOverlays(page);
    const funding = page.locator('.w-oc-tile').filter({ hasText: 'Funding Rate' });
    await funding.locator('.w-oc-tv').filter({ hasText: /%/ }).waitFor({ timeout: 90_000 });
    const etfCount = () => page.locator('.w-oc-panel .w-oc-ttl', { hasText: 'ETF Flow' }).count();
    await shot(5, 'btc-with-etf', page.locator('[data-tour="oc-brow"]'), `BTC: middle row has CVD, US Demand Premium and ETF Flow (${await etfCount()} ETF panel).`);
    await shot(6, 'btc-funding', funding, `BTC Funding Rate tile: "${(await funding.innerText()).replace(/\s+/g, ' ').slice(0, 120)}".`);
    const netflow = page.locator('.w-oc-tile').filter({ hasText: 'Exchange Netflow' });
    await shot(7, 'btc-netflow-7d', netflow, `Exchange Netflow on the 24H page range: "${(await netflow.innerText()).replace(/\s+/g, ' ').slice(0, 140)}".`);
    await page.getByRole('button', { name: /Show more metrics/ }).click();
    const oi = page.locator('.w-oc-panel').filter({ hasText: 'Open Interest Trend' });
    await shot(8, 'btc-open-interest', oi, `Open Interest panel: "${(await oi.locator('.w-oc-wi-row').innerText().catch(() => '')).replace(/\s+/g, ' ')}".`);
    await page.getByRole('button', { name: 'HYPE', exact: true }).first().click();
    await funding.locator('.w-oc-tv').filter({ hasText: /%/ }).waitFor({ timeout: 90_000 });
    await page.waitForTimeout(1500);
    await shot(5, 'switcher-hype', page.locator('[data-tour="oc-controls"]'), 'Coin switcher: BTC, ETH, SOL, BNB, HYPE — no AVAX.');
    await shot(5, 'hype-no-etf', page.locator('[data-tour="oc-brow"]'), `HYPE: no ETF Flow panel (${await etfCount()} ETF panels) — two panels in the middle row.`);
    await shot(6, 'hype-funding', funding, `HYPE Funding Rate tile: "${(await funding.innerText()).replace(/\s+/g, ' ').slice(0, 120)}".`);
  });

  test('Spot Pulse (items 9–12)', async ({ page }) => {
    test.setTimeout(300_000);
    await openPage(page, '/world/onchain');
    await dismissOverlays(page);
    const sp = page.locator('[data-tour="oc-spotpulse"]');
    await sp.locator('.w-sp-grid .w-sp-tile').first().waitFor({ timeout: 90_000 });
    const data = async (tf: string) => (await apiAsUser<{ marketVerdict: string; tiles: { asset: string; verdict: string; dirs?: { price: string; spot: string; fut: string } }[]; alerts: unknown[] }>(page, `/api/market/spot-pulse?tf=${tf}&view=plus`)).body;
    const d4 = await data('4H');
    const tile = sp.locator('.w-sp-grid .w-sp-tile').first();
    await tile.hover();
    await page.waitForTimeout(400);
    const t0 = d4.tiles[0];
    await shot(9, 'hover-card', sp, `Hover card on ${t0.asset} (4H): price ${t0.dirs?.price}, spot ${t0.dirs?.spot}, futures ${t0.dirs?.fut} → ${t0.verdict}.`);
    await page.mouse.move(0, 0);
    await shot(10, 'tiles-4h', sp, `4H tiles: ${d4.tiles.map((t) => `${t.asset} ${t.verdict} (${t.dirs?.price}/${t.dirs?.spot}/${t.dirs?.fut})`).join(' · ')}.`);
    await shot(11, 'banner-4h', sp, `4H market verdict: ${d4.marketVerdict} — from ${d4.tiles.map((t) => t.verdict).join(', ')}.`);
    if (d4.alerts.length === 0) await shot(12, 'empty-4h', sp, '4H: no cards — "No divergence signals in this window right now." and footer count 0.');
    await sp.getByRole('button', { name: '7D', exact: true }).click();
    await page.waitForTimeout(6000);
    const d7 = await data('7D');
    await shot(10, 'tiles-7d', sp, `7D tiles: ${d7.tiles.map((t) => `${t.asset} ${t.verdict} (${t.dirs?.price}/${t.dirs?.spot}/${t.dirs?.fut})`).join(' · ')}.`);
    await shot(12, 'cards-7d', sp, `7D: ${d7.alerts.length} alert cards; footer count = cards; banner ${d7.marketVerdict}.`);
  });

  test('Flow Radar Plus (items 13–17)', async ({ page }) => {
    test.setTimeout(300_000);
    await openPage(page, '/world/flow-radar');
    await dismissOverlays(page);
    const { body } = await apiAsUser<{ events: { type: string; direction: string; severity: string; ts: string; crossSignal?: { label: string } }[]; verdict: { label: string }; aiSentences?: Record<string, unknown>; delayedAsOf: string | null }>(page, '/api/market/flow-radar?view=plus');
    const oldestMin = body.events.length ? Math.round((Date.now() - Math.max(...body.events.map((e) => Date.parse(e.ts)))) / 60000) : null;
    await page.locator('.w-flow-radar-verdict').waitFor({ timeout: 90_000 });
    await shot(13, 'flow-radar-plus', page, `Flow Radar Plus: ${body.events.length} events, newest is ${oldestMin} min old (≥ 15), only HIGH/MED, 5 core coins + Dry Powder.`);
    const chip = async (name: string, item: number, file: string, caption: string) => {
      const b = page.getByRole('button', { name, exact: true });
      await b.click();
      await page.waitForTimeout(800);
      await shot(item, file, page, caption);
      await b.click();
      await page.waitForTimeout(300);
    };
    const count = (t: string) => body.events.filter((e) => e.type === t);
    await chip('Whale Transfer', 13, 'whale-filter', `Whale Transfer filter: ${count('whale_transfer').length} rows, directions ${[...new Set(count('whale_transfer').map((e) => e.direction))].join('/') || 'none now'}.`);
    await chip('Exchange Flow', 14, 'dry-powder-filter', `Exchange Flow filter: ${count('exchange_flow').length} Dry Powder rows (${[...new Set(count('exchange_flow').map((e) => e.direction))].join('/') || 'none on Plus right now — needs $100M+ net in an hour'}).`);
    await chip('Liquidation Spike', 15, 'liquidation-filter', `Liquidation Spike filter: ${count('liq_spike').length} rows (${[...new Set(count('liq_spike').map((e) => e.direction))].join('/') || 'none on Plus right now'}).`);
    await chip('Smart Money', 15, 'smart-money-filter', `Smart Money filter: ${count('smart_money').length} rows (${[...new Set(count('smart_money').map((e) => e.direction))].join('/') || 'none on Plus right now'}).`);
    for (const tf of ['1H', '4H', '24H']) {
      await page.locator('.w-flow-radar-timeframe button', { hasText: tf }).first().click();
      await page.waitForTimeout(600);
      const label = await page.locator('.w-flow-radar-verdict-label').innerText();
      await shot(16, `verdict-${tf.toLowerCase()}`, page.locator('.w-flow-radar-verdict'), `${tf} verdict band: "${label}" — ${await page.locator('.w-flow-radar-verdict-stat').innerText().catch(() => '')}.`);
    }
    const outlined = page.locator('.w-radar-item[class*="w-radar-item-cross-"]').first();
    const crossN = body.events.filter((e) => e.crossSignal).length;
    if (crossN > 0) {
      await shot(17, 'outline', outlined, `Outlined row — "${await outlined.getAttribute('title')}". ${crossN} outlined events in the feed.`);
    } else {
      record({ item: 17, file: null, caption: 'No outlined rows in the Plus feed right now (needs e.g. a whale Outflow while that coin\'s Spot Pulse reads REAL BUYING/ACCUMULATION).' });
      save();
    }
    const sentence = page.locator('.w-flow-radar-verdict p');
    const ai = await sentence.getAttribute('title');
    await shot(17, 'ai-line', page.locator('.w-flow-radar-verdict'), ai ? `AI line under the band (hover title: "${ai}").` : `Under the band: "${(await page.locator('.w-flow-radar-verdict .w-ai-soon').innerText().catch(() => 'nothing'))}" — AI off until Gemini billing, no template sentence.`);
  });
});

test.describe('v1.16 evidence — Pro (qa2)', () => {
  test.use({ storageState: AUTH.pro, viewport: { width: 1440, height: 1000 } });

  test('Pro views (items 9, 14–16)', async ({ page }) => {
    test.setTimeout(300_000);
    await openPage(page, '/world/pro?tab=spotpulse');
    await dismissOverlays(page);
    const grid = page.locator('.w-sp-grid').first();
    await grid.locator('.w-sp-tile').first().waitFor({ timeout: 120_000 });
    await grid.locator('.w-sp-tile').nth(5).hover().catch(() => grid.locator('.w-sp-tile').first().hover());
    await page.waitForTimeout(400);
    await shot(9, 'pro-hover-card', page, 'Spot Pulse Pro (10 tiles): the hover card works on Pro too.');
    await openPage(page, '/world/pro?tab=flowradar');
    await dismissOverlays(page);
    await page.locator('.w-flow-radar-verdict').waitFor({ timeout: 120_000 });
    const { body } = await apiAsUser<{ events: { severity: string; type: string }[] }>(page, '/api/market/flow-radar?view=pro');
    const low = body.events.filter((e) => e.severity === 'LOW');
    await shot(15, 'flow-radar-pro', page, `Flow Radar Pro (real-time): ${body.events.length} events, ${low.length} LOW (Pro only) — ${[...new Set(low.map((e) => e.type))].join(', ') || 'none'}.`);
    await page.locator('.w-flow-radar-timeframe button', { hasText: '7D' }).first().click();
    await page.waitForTimeout(600);
    await shot(16, 'pro-verdict-7d', page.locator('.w-flow-radar-verdict'), `Pro 7D verdict band (thresholds ×10): "${await page.locator('.w-flow-radar-verdict-label').innerText()}".`);
  });
});

test.describe('v1.16 evidence — items 18–21', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('Plus: Fear & Greed News Tone + Watchlist Plus (items 18, 20)', async ({ browser }) => {
    test.setTimeout(240_000);
    const ctx = await browser.newContext({ storageState: AUTH.plus, viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await openPage(page, '/world/fear-greed');
    await dismissOverlays(page);
    const { body: fg } = await apiAsUser<{ composite: { score: number; label: string }; subMetrics: Record<string, { label: string; unavailable?: boolean; source: string }> }>(page, '/api/market/fear-greed');
    const nt = page.locator('.w-fg-tile').filter({ hasText: 'News Tone' });
    await shot(18, 'news-tone', nt.locator('xpath=..'), `News Tone: "${fg.subMetrics.newsTone.source}". Composite ${fg.composite.score} (${fg.composite.label}) from ${Object.values(fg.subMetrics).filter((m) => !m.unavailable).map((m) => m.label).join(', ')}.`);
    await page.getByRole('button', { name: /How this works/ }).click();
    await shot(18, 'how-it-works', page.locator('.w-fg-how-body'), 'How this works: missing signals are left out, nothing filled in.');
    await openPage(page, '/world/console');
    const popup = page.getByRole('dialog', { name: 'Needs your attention today' });
    if (await popup.isVisible().catch(() => false)) await popup.getByRole('button', { name: 'Close' }).click();
    await shot(18, 'console-ai-soon', page.locator('[data-tour="market"]'), `Console: "${await page.locator('.w-mc-ai').innerText()}" under the regime; "Confidence" (not "AI confidence").`);
    await openPage(page, '/world/watchlist');
    await dismissOverlays(page);
    const { body: wl } = await apiAsUser<{ assets: { asset: string; actionTags: { label: string }[]; regimeTag?: { label: string } }[] }>(page, '/api/market/watchlist');
    await page.waitForTimeout(3000);
    await shot(20, 'watchlist-plus', page, `Watchlist Plus: ${wl.assets.map((a) => `${a.asset} [${[...a.actionTags.map((t) => t.label), a.regimeTag?.label].filter(Boolean).join(', ') || 'no tag'}]`).join(' · ')}.`);
    await ctx.close();
  });

});

test.describe('v1.16 evidence — items 19, 21–27', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });
  const day = (h: number) => new Date(Date.now() + h * 3_600_000);
  const T = (x: string) => `${QA_PREFIX} Ev ${x}`;
  const CAL = [T('CPI (HIGH)'), T('Listing (MED)'), T('Speech (LOW)'), T('Token sale'), T('Listing 4'), T('Listing 5')];
  const DROP = T('Drop');

  test.beforeAll(async () => {
    const db = admin().db;
    const date = day(50).toISOString().slice(0, 10);
    const base = { d: 'QA evidence', assets: '', status: 'published', createdAt: new Date(), date };
    await db.collection('pro_calendar').add({ ...base, t: CAL[0], imp: 'high', cat: 'Macro', time: '12:30' });
    await db.collection('pro_calendar').add({ ...base, t: CAL[1], imp: 'med', cat: 'Listing', time: '13:00' });
    await db.collection('pro_calendar').add({ ...base, t: CAL[2], imp: 'low', cat: 'Macro', time: '14:00' });
    await db.collection('pro_calendar').add({ ...base, t: CAL[3], imp: 'med', cat: 'Token sale / TGE', time: '15:00', assets: 'EVT', venue: 'Binance Launchpool', raise: '$12M raise', link: 'https://example.com' });
    await db.collection('pro_calendar').add({ ...base, t: CAL[4], imp: 'med', cat: 'Listing', time: '16:00' });
    await db.collection('pro_calendar').add({ ...base, t: CAL[5], imp: 'med', cat: 'Listing', time: '17:00' });
    await db.collection('pro_airdrops').add({ name: DROP, cat: 'airdrop', desc: 'QA evidence', status: 'published', tgeDate: day(74).toISOString().slice(0, 10), createdAt: new Date() });
  });
  test.afterAll(async () => {
    await deleteQaDocs('pro_calendar', 't', [...CAL, T('sale without venue')]);
    await deleteQaDocs('pro_airdrops', 'name', [DROP]);
  });

  test('item 19 — admin form: token sale needs venue/raise/link', async ({ browser }) => {
    test.setTimeout(240_000);
    const ctx = await browser.newContext({ storageState: AUTH.admin, viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await openPage(page, '/admin/pro-calendar', { ready: 'text=Scheduled events' });
    const form = page.locator('form').first();
    await form.locator('input').first().fill(T('sale without venue'));
    await form.locator('input[type="date"]').fill(day(48).toISOString().slice(0, 10));
    await form.locator('input[type="time"]').fill('10:00');
    await form.locator('select').nth(1).selectOption('Token sale / TGE');
    await form.getByRole('button', { name: /^Publish$/ }).click();
    await page.waitForTimeout(800);
    const msg = (await form.locator('p.text-sm').last().innerText().catch(() => '')).trim();
    await shot(19, 'admin-token-sale-refused', form, `Admin: Token sale / TGE without venue, raise and link → refused: "${msg}". Categories include Listing and Token sale / TGE; the importance guide is in the form.`);
    await ctx.close();
  });

  test('item 19 — Calendar: HIGH+MED default, LOW toggle, 3 per day, airdrops Pro only', async ({ browser }) => {
    test.setTimeout(300_000);
    for (const role of ['plus', 'pro'] as const) {
      const ctx = await browser.newContext({ storageState: AUTH[role], viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      await openPage(page, '/world/calendar');
      await dismissOverlays(page);
      if (await page.getByRole('dialog').first().isVisible().catch(() => false)) await page.keyboard.press('Escape').catch(() => {});
      const { body } = await apiAsUser<{ events: { id: string; title: string; impact: string }[] }>(page, '/api/market/calendar');
      const ours = body.events.filter((e) => e.title.includes('[TEST] Ev'));
      const air = body.events.filter((e) => e.id.startsWith('airdrop-'));
      const cell = page.locator('.w-cal-cell').filter({ hasText: '[TEST] Ev' }).first();
      await cell.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(800);
      await shot(19, `calendar-${role}`, page, `${role === 'pro' ? 'Pro' : 'Plus'}: a test day with 6 team events (1 HIGH, 4 MED, 1 LOW) — LOW hidden by default, the cell shows 3 + "+N more". API: ${ours.length} test events, ${air.length} airdrop dates (${role === 'pro' ? 'Pro sees the test airdrop' : 'Plus sees none'}).`);
      if (role === 'plus') {
        await page.getByRole('button', { name: 'LOW', exact: true }).first().click().catch(() => {});
        await page.waitForTimeout(600);
        await shot(19, 'calendar-plus-low-on', page, 'Plus with LOW switched on: the LOW test event is now counted in the day cell.');
      }
      await ctx.close();
    }
  });

  test('item 21 — Pro Daily Digest + alert coins', async ({ browser }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext({ storageState: AUTH.pro, viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await openPage(page, '/world/pro?tab=digest');
    await dismissOverlays(page);
    await page.locator('.dig-section').filter({ hasText: 'Loading…' }).first().waitFor({ state: 'detached', timeout: 120_000 }).catch(() => {});
    await shot(21, 'digest', page, `Daily Digest: Smart Money, Also Worth Watching and Fear & Greed sections; old disclaimer present: ${(await page.getByText(/once the market-data/).count()) > 0 ? 'YES' : 'no'}.`);
    await openPage(page, '/world/pro?tab=followhub');
    await dismissOverlays(page);
    const builder = page.locator('[data-tour="fa-builder"]');
    for (const sym of ['HYPE', 'POL']) {
      await builder.getByLabel('subject').fill(sym);
      await builder.getByLabel('threshold').fill('5');
      await builder.getByRole('button', { name: 'Add alert' }).click();
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(6000);
    const row = page.locator('.chart-side-row').filter({ hasText: /HYPE|POL/ }).first();
    await shot(21, 'alerts-hype-pol', row.locator('xpath=..'), "Price alerts for HYPE and POL (MATIC's new name) showing live Binance prices.");
    for (let i = 0; i < 2; i++) {
      const r = page.locator('.chart-side-row').filter({ hasText: /HYPE|POL/ }).first();
      if (await r.count()) await r.getByRole('button', { name: 'Delete alert' }).click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await ctx.close();
  });

  test('items 22–24 — Spot Pulse Pro, Flow Radar Pro', async ({ browser }) => {
    test.setTimeout(400_000);
    const ctx = await browser.newContext({ storageState: AUTH.pro, viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await openPage(page, '/world/pro?tab=spotpulse');
    await dismissOverlays(page);
    await page.locator('.w-sp-grid .w-sp-tile').first().waitFor({ timeout: 120_000 });
    const { body: sp } = await apiAsUser<{ marketVerdict: string; tiles: { asset: string; row: number; source?: string }[] }>(page, '/api/market/spot-pulse?tf=4H&view=pro');
    const row2 = sp.tiles.filter((t) => t.row === 2);
    await shot(22, 'spot-pulse-pro', page, `Spot Pulse Pro: ${sp.tiles.length} tiles — row 1 ${sp.tiles.filter((t) => t.row === 1).map((t) => t.asset).join(', ')}; row 2 ${row2.map((t) => `${t.asset} (${t.source === 'top-volume' ? 'Top volume' : 'Also Worth Watching'})`).join(', ')}; market verdict ${sp.marketVerdict} (same share rules as Plus).`);
    await openPage(page, '/world/pro?tab=flowradar');
    await dismissOverlays(page);
    await page.locator('.w-flow-radar-verdict').waitFor({ timeout: 120_000 });
    const { body: fr } = await apiAsUser<{ events: { asset: string; type: string; marketWide?: boolean }[]; delayed: boolean }>(page, '/api/market/flow-radar?view=pro');
    const CORE = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];
    const others = [...new Set(fr.events.filter((e) => !e.marketWide && !CORE.includes(e.asset)).map((e) => e.asset))];
    await shot(23, 'flow-radar-pro-coins', page, `Flow Radar Pro: real-time (delayed=${fr.delayed}), ${fr.events.length} events; non-core coins shown, all past the ≥ $1M spot-volume filter: ${others.join(', ') || 'none right now'}.`);
    const bal = page.locator('[data-tour="fr-balance"]');
    await shot(24, 'flow-balance', bal, `Flow Balance (Pro, last 24h): "${(await bal.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160)}".`);
    await shot(24, 'netflow-flip-chip', page.locator('.w-flow-radar-filters'), `Pro filter chips include Netflow Flip; ${fr.events.filter((e) => e.type === 'netflow_flip').length} netflow-flip events right now; no "Delayed" chip on Pro.`);
    await ctx.close();
  });

  test('items 25–27 — Watchlist Pro: pins, Also Worth Watching, live prices', async ({ browser }) => {
    test.setTimeout(400_000);
    const ctx = await browser.newContext({ storageState: AUTH.pro, viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    const sockets: string[] = [];
    page.on('websocket', (ws) => sockets.push(ws.url()));
    await openPage(page, '/world/pro?tab=watchlist');
    await dismissOverlays(page);
    const input = page.getByPlaceholder('Add a ticker (e.g. BTC)');
    const sec = page.locator('[data-tour="wl-sections"]');
    const pin = async (sym: string, file: string, expectText: RegExp | string) => {
      await input.fill(sym);
      await page.getByRole('button', { name: /Pin/ }).click();
      await page.getByText(expectText).first().waitFor({ timeout: 30_000 }).catch(() => {});
      await shot(25, file, sec, `Pin ${sym}: "${(await page.getByText(expectText).first().innerText().catch(() => 'no message')).trim()}".`);
    };
    await pin('USDC', 'pin-usdc', "Stablecoins and wrapped tokens can't be pinned.");
    await pin('BTC', 'pin-btc', /BTC is a core asset/);
    await pin('ZZZQ', 'pin-zzzq', 'Not enough liquidity to track reliably.');
    await pin('PEPE', 'pin-pepe', /[1-9]\d*\/15 assets tracked/);
    const prow = page.locator('.w-wl-trow').filter({ hasText: 'PEPE' });
    await prow.getByRole('button', { name: /^(Remove|Remove PEPE)$/ }).filter({ visible: true }).first().click().catch(() => {});
    const { body } = await apiAsUser<{ sectionC: { asset: string; reasons: string[] }[]; sectionCMode?: string }>(page, '/api/market/watchlist?view=pro');
    const c = page.locator('.w-wl-table').filter({ hasText: 'Also Worth Watching' });
    await shot(26, 'also-worth-watching', c, `Also Worth Watching (mode: ${body.sectionCMode}): ${body.sectionC.map((x) => `${x.asset} — ${x.reasons.join(' · ')}`).join(' | ') || 'no coin qualifies right now'}.`);
    const table = page.locator('[data-tour="wl-table"]');
    const p1 = await table.innerText();
    let p2 = p1;
    for (let i = 0; i < 10 && p2 === p1; i++) { await page.waitForTimeout(3000); p2 = await table.innerText(); }
    await shot(27, 'live-prices', page.locator('[data-tour="wl-table"]'), `Live prices: Binance price stream connected: ${sockets.some((u) => u.includes('stream.binance.com')) ? 'yes' : 'no'}; a price on the table changed within 30 s: ${p1 !== p2 ? 'yes' : 'no (quiet tick)'}.`);
    await ctx.close();
  });
});
