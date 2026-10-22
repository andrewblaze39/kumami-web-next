/**
 * QA — Spot Pulse engine v1.15 (Rachelle Plus §2.9 + Pro §5). Live data.
 */
import { expect, test } from '@playwright/test';
import { AUTH, apiAsUser, expectSaneText, guard, openPage, snap } from '../helpers';

type Tile = { asset: string; verdict: string; row: 1 | 2; insufficient?: boolean; notEnoughHistory?: boolean; source?: string; priceChange4h: number };
type Payload = { tiles: Tile[]; marketVerdict: string; alerts: { verdict: string }[]; footer: { totalSpotVol24h: number | null; divergenceCount: number }; updatedAt: string };

const VERDICTS = ['REAL BUYING', 'ACCUMULATION', 'REVERSAL SETUP', 'SPECULATIVE', 'FORCED DECLINE', 'DISTRIBUTION', 'QUIET DISTRIBUTION', 'COHERENT DECLINE', 'BALANCED'];
const MARKET = ['Broad Buying', 'Distribution Wave', 'Broad Selloff', 'Selective Accumulation', 'Speculation Dominant', 'Mixed Market', 'Not enough data'];
const CORE = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];

function check(p: Payload) {
  expect(MARKET, `market verdict ${p.marketVerdict}`).toContain(p.marketVerdict);
  for (const t of p.tiles) {
    expect(VERDICTS, `${t.asset} verdict ${t.verdict}`).toContain(t.verdict);
    if (t.notEnoughHistory || t.insufficient) expect(t.verdict).toBe('BALANCED');
    expect(Number.isFinite(t.priceChange4h)).toBe(true);
  }
  expect(p.tiles.filter((t) => t.row === 1).map((t) => t.asset)).toEqual(CORE.filter((c) => p.tiles.some((t) => t.asset === c && t.row === 1)));
  const withData = p.tiles.filter((t) => !t.insufficient && !t.notEnoughHistory).length;
  if (withData < 4) expect(p.marketVerdict).toBe('Not enough data');
  expect(p.footer.totalSpotVol24h === null || p.footer.totalSpotVol24h > 0).toBe(true);
}

test.describe('Spot Pulse Plus v1.15 (qa1)', () => {
  test.use({ storageState: AUTH.plus });

  test('all three timeframes: valid verdicts, share-based market verdict, 24h spot volume', async ({ page }, info) => {
    test.setTimeout(240_000);
    const g = guard(page);
    await openPage(page, '/world/onchain');
    const seen = new Set<string>();
    for (const tf of ['4H', '24H', '7D']) {
      const { status, body } = await apiAsUser<Payload>(page, `/api/market/spot-pulse?tf=${tf}&view=plus`);
      expect(status, tf).toBe(200);
      check(body);
      expect(body.tiles.length).toBeLessThanOrEqual(5);
      expect(body.tiles.filter((t) => !t.insufficient).length, `${tf}: every tile NO DATA`).toBeGreaterThan(0);
      body.tiles.forEach((t) => seen.add(`${tf}:${t.asset}:${t.verdict}`));
      expect(body.footer.divergenceCount, `${tf}: footer count = cards shown`).toBe(body.alerts.length);
    }
    await info.attach('verdicts', { body: [...seen].join('\n'), contentType: 'text/plain' });
    await expect(page.getByText(/Updated (just now|\d+ min ago)/).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/24h spot volume/).first()).toBeVisible();
    // Hover card (22 Oct 2026): directions behind the verdict, on Plus and Pro.
    const tile = page.locator('.w-sp-grid .w-sp-tile').first();
    await tile.hover();
    const pop = tile.locator('.w-sp-pop');
    await expect(pop).toBeVisible();
    await expect(pop).toContainText(/Price 4H/);
    await expect(pop).toContainText(/UP|FLAT|DOWN|Not enough data/);
    await expectSaneText(page);
    await snap(page, info, 'v115-spotpulse-plus');
    g.assertClean();
  });
});

test.describe('Spot Pulse Pro v1.15 (qa2)', () => {
  test.use({ storageState: AUTH.pro });

  test('10 tiles: core row + Also Worth Watching / Top volume row 2', async ({ page }, info) => {
    test.setTimeout(240_000);
    const g = guard(page);
    await openPage(page, '/world/pro?tab=spotpulse');
    const { status, body } = await apiAsUser<Payload>(page, '/api/market/spot-pulse?tf=4H&view=pro');
    expect(status).toBe(200);
    check(body);
    const row2 = body.tiles.filter((t) => t.row === 2);
    expect(row2.length).toBeLessThanOrEqual(5);
    for (const t of row2) {
      expect(['watchlist', 'top-volume']).toContain(t.source);
      expect(CORE).not.toContain(t.asset);
      expect(['USDT', 'USDC', 'WBTC', 'WETH']).not.toContain(t.asset);
    }
    if (row2.some((t) => t.source === 'top-volume')) await expect(page.getByText('Top volume').first()).toBeVisible();
    // Hover card (22 Oct 2026): directions behind the verdict, on Plus and Pro.
    const tile = page.locator('.w-sp-grid .w-sp-tile').first();
    await tile.hover();
    const pop = tile.locator('.w-sp-pop');
    await expect(pop).toBeVisible();
    await expect(pop).toContainText(/Price 4H/);
    await expect(pop).toContainText(/UP|FLAT|DOWN|Not enough data/);
    await expectSaneText(page);
    await snap(page, info, 'v115-spotpulse-pro');
    await info.attach('row2', { body: JSON.stringify(row2.map((t) => [t.asset, t.source, t.verdict])), contentType: 'application/json' });
    g.assertClean();
  });
});
