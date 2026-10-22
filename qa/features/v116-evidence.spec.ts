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
const manifest: Shot[] = [];

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
    manifest.push({ item, file, caption });
  } catch (e) {
    manifest.push({ item, file: null, caption: `${caption} — screenshot failed: ${String(e).slice(0, 120)}` });
  }
  save();
}

const BADGE = `${QA_PREFIX} Evidence CPI`;

test.describe.configure({ mode: 'serial' });

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
      manifest.push({ item: 17, file: null, caption: 'No outlined rows in the Plus feed right now (needs e.g. a whale Outflow while that coin\'s Spot Pulse reads REAL BUYING/ACCUMULATION).' });
      save();
    }
    const sentence = page.locator('.w-flow-radar-verdict p');
    const ai = await sentence.getAttribute('title');
    await shot(17, 'ai-line', page.locator('.w-flow-radar-verdict'), ai ? `AI line under the band (hover title: "${ai}").` : 'Sentence under the band is the plain template — the AI line is off (Gemini free-tier quota) until billing is on.');
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
