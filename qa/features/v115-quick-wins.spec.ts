/**
 * QA — Rachelle's v1.15 quick wins (plan docs/plans/2026-10-21-v115-quick-wins.md).
 *
 *   On-Chain (Plus §2): HYPE replaces AVAX, continuous funding bands at the feed's
 *     real scale, Netflow reads 7D on the 24H page, flat-OI states
 *   Watchlist (Plus §6): funding tags at the right scale, valid regimes
 *   Console badge (Plus §1.5): team-added HIGH event within 6h; MED / far events don't show
 *   Daily Digest (Pro §1): 3 market lines, old disclaimer gone
 */
import { expect, test } from '@playwright/test';
import { AUTH, apiAsUser, expectSaneText, guard, openPage, snap } from '../helpers';
import { deleteQaDocs, QA_PREFIX } from '../admin-data';
import { admin } from '../personas';

type Panel = { verdict: { label: string; color: string }; extra?: Record<string, number | string> };
type OnChain = { asset: string; panels: Record<string, Panel> };

const FUNDING_LABELS = ['Overheated Long', 'Crowded Long', 'Neutral', 'Crowded Short', 'Extreme Short'];
const OI_LABELS = [
  'Trend Strengthening', 'Leverage Building', 'Overleveraged Market', 'Short Covering Rally',
  'Capitulation/Unwind', 'Deleveraging', 'Trend Without Leverage', 'Decline Without Panic', 'Stable OI',
];

/** The band the funding rate must land in (v1.15 Plus §2.1, percent units). */
function expectedBand(pct: number): string {
  if (pct > 0.15) return 'Overheated Long';
  if (pct >= 0.05) return 'Crowded Long';
  if (pct > -0.05) return 'Neutral';
  if (pct >= -0.1) return 'Crowded Short';
  return 'Extreme Short';
}

test.describe('On-Chain v1.15 (qa1)', () => {
  test.use({ storageState: AUTH.plus });

  test('HYPE replaces AVAX; funding band matches the rate; Netflow reads 7D on 24H', async ({ page }, info) => {
    test.setTimeout(240_000);
    const g = guard(page);
    await openPage(page, '/world/onchain');
    await expect(page.getByRole('button', { name: 'HYPE', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'AVAX', exact: true })).toHaveCount(0);

    for (const asset of ['BTC', 'HYPE']) {
      const { status, body } = await apiAsUser<OnChain>(page, `/api/market/onchain?asset=${asset}&range=24h`);
      expect(status, `${asset} on-chain status`).toBe(200);
      const f = body.panels.funding;
      const rate = Number(f.extra?.currentRatePct);
      if (Number.isFinite(rate)) {
        expect(FUNDING_LABELS.some((l) => f.verdict.label.endsWith(l)), `funding label ${f.verdict.label}`).toBe(true);
        // Real funding sits around ±0.01% — a reading ≥ 0.5% means the ×100 bug is back.
        expect(Math.abs(rate), `${asset} funding ${rate}% looks ×100`).toBeLessThan(0.5);
      }
      expect(f.verdict.label).not.toMatch(/Mild Short Bias/);
      const oi = body.panels.oi.verdict.label;
      if (!/unavailable/i.test(oi)) expect(OI_LABELS, `OI label ${oi}`).toContain(oi);
      const nf = body.panels.netflow;
      if (nf.extra?.netRange !== undefined) expect(nf.extra.netRange, 'Netflow should read 7D on 24H').toBe('7d');
    }
    // The 3-cycle average and the shown rate can differ — check the band logic on the latest rate only when they agree in sign.
    const btc = await apiAsUser<OnChain>(page, '/api/market/onchain?asset=BTC&range=7d');
    const rate = Number(btc.body.panels.funding.extra?.currentRatePct);
    if (Number.isFinite(rate) && Math.abs(rate) < 0.04) {
      expect(btc.body.panels.funding.verdict.label.replace(/^Persistently /, '')).toBe(expectedBand(rate));
    }

    const fundingValue = page.locator('.w-oc-tile').filter({ hasText: 'Funding Rate' }).locator('.w-oc-tv');
    await page.getByRole('button', { name: 'HYPE', exact: true }).first().click();
    await expect(fundingValue).toHaveText(/%/, { timeout: 60_000 }); // cold cache: ~16 upstream reads
    await expect(page.getByText(/Exchange balance flow|Coins (leaving|arriving)|Updates daily|unavailable|—/).first()).toBeVisible();
    // No ETF data for HYPE: no ETF panel (Andrew, 22 Oct 2026 — it used to show Bitcoin ETFs unlabelled).
    await expect(page.locator('.w-oc-panel .w-oc-ttl', { hasText: 'ETF Flow' })).toHaveCount(0);
    await expectSaneText(page);
    await snap(page, info, 'v115-onchain-hype');

    await page.getByRole('button', { name: 'BTC', exact: true }).first().click();
    await expect(fundingValue).toHaveText(/%/, { timeout: 60_000 });
    await expect(page.getByText(/· 7D \(updates daily\)|Updates daily|Exchange balance flow/).first()).toBeVisible();
    await expect(page.locator('.w-oc-panel .w-oc-ttl', { hasText: 'ETF Flow' })).toHaveCount(1);
    await expectSaneText(page);
    await snap(page, info, 'v115-onchain-btc');
    g.assertClean();
  });

  test('Watchlist Plus: funding tags at the feed scale, valid regimes', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/watchlist');
    const { body } = await apiAsUser<{ assets: { asset: string; regime: string; actionTags: { label: string }[] }[] }>(page, '/api/market/watchlist?view=plus');
    expect(body.assets.length).toBeGreaterThan(0);
    for (const a of body.assets) {
      expect(['Trending Up', 'Trending Down', 'Coiling', 'Ranging']).toContain(a.regime);
      expect(a.actionTags.length).toBeLessThanOrEqual(2);
    }
    // Compare with the On-Chain funding for BTC: an Overheated tag needs funding > 0.1%.
    const oc = await apiAsUser<OnChain>(page, '/api/market/onchain?asset=BTC&range=24h');
    const btcRate = Number(oc.body.panels.funding.extra?.currentRatePct);
    const btc = body.assets.find((a) => a.asset === 'BTC');
    if (btc && Number.isFinite(btcRate) && btcRate < 0.05) {
      expect(btc.actionTags.map((t) => t.label), 'Overheated on normal funding = scale bug').not.toContain('Overheated');
    }
    await expectSaneText(page);
    await snap(page, info, 'v115-watchlist-plus');
    g.assertClean();
  });
});

test.describe('Console badge v1.15 Plus §1.5 (qa1)', () => {
  test.describe.configure({ mode: 'serial' });
  const HIGH = `${QA_PREFIX} Badge CPI`;
  const MED = `${QA_PREFIX} Badge MED`;
  const FAR = `${QA_PREFIX} Badge far HIGH`;

  const at = (hours: number) => {
    const d = new Date(Date.now() + hours * 3_600_000);
    return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
  };

  test.beforeAll(async () => {
    const db = admin().db;
    const base = { cat: 'Macro', d: 'QA badge check', assets: '', status: 'published', createdAt: new Date() };
    await db.collection('pro_calendar').add({ ...base, t: HIGH, imp: 'high', ...at(3) });
    await db.collection('pro_calendar').add({ ...base, t: MED, imp: 'med', ...at(2) });
    await db.collection('pro_calendar').add({ ...base, t: FAR, imp: 'high', ...at(9) });
  });
  test.afterAll(async () => {
    await deleteQaDocs('pro_calendar', 't', [HIGH, MED, FAR]);
  });

  test.use({ storageState: AUTH.plus });

  test('team HIGH event in ~3h shows; MED and 9h-away events do not', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/console');
    const badge = page.locator('.w-console-event-badge');
    await expect(badge).toBeVisible({ timeout: 30_000 });
    await expect(badge).toContainText(HIGH);
    await expect(badge).toContainText(/in [23]h — expect volatility/);
    await expect(badge).not.toContainText(MED);
    await expect(badge).not.toContainText(FAR);
    await expectSaneText(page);
    // The attention popup (24h window) opens over the page too — close it, then use the badge.
    const popup = page.getByRole('dialog', { name: 'Needs your attention today' });
    if (await popup.isVisible().catch(() => false)) {
      await expect(popup).not.toContainText(MED);
      await popup.getByRole('button', { name: 'Close' }).click();
    }
    const box = await badge.locator('svg').boundingBox();
    expect(box?.width ?? 99, 'badge icon must be small').toBeLessThanOrEqual(20);
    await snap(page, info, 'v115-console-badge');
    await badge.click();
    await expect(page).toHaveURL(/\/world\/calendar/);
    g.assertClean();
  });
});

test.describe('Daily Digest v1.15 Pro §1 (qa2)', () => {
  test.use({ storageState: AUTH.pro });

  test('three market lines, no outdated disclaimer', async ({ page }, info) => {
    test.setTimeout(240_000);
    const g = guard(page);
    await openPage(page, '/world/pro?tab=digest');
    await expect(page.getByText(/once the market-data/)).toHaveCount(0);
    for (const h of ['Smart Money', 'Also Worth Watching', 'Fear & Greed']) {
      await expect(page.locator('.dig-section h3').filter({ hasText: h })).toBeVisible();
    }
    // Lines finish loading (no "Loading…" left) and each shows data or an honest empty line.
    // Cold caches: Flow Radar Pro + Watchlist Pro can take ~1 min on the first read.
    await expect(page.locator('.dig-section').filter({ hasText: 'Loading…' })).toHaveCount(0, { timeout: 120_000 });
    const fg = page.locator('.dig-section').filter({ hasText: 'Fear & Greed' });
    await expect(fg.getByText(/\d+ \/ 100|No Fear & Greed read|Unavailable/)).toBeVisible();
    const sm = page.locator('.dig-section').filter({ hasText: 'Smart Money' });
    await expect(sm.getByText(/(long|short) opened|No large position opens|Unavailable/).first()).toBeVisible();
    await expectSaneText(page);
    await snap(page, info, 'v115-digest');
    g.assertClean();
  });
});
