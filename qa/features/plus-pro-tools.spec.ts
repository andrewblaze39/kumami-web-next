/**
 * QA — the Pro versions of the market tools (Andrew's spec v1.6, plan
 * docs/plans/2026-10-10-plus-pro-tool-split.md QA checklist 3, 6, 7). The Plus
 * side and the leak checks live in access-matrix.spec.ts.
 */
import { expect, test } from '@playwright/test';
import { AUTH, apiAsUser, expectSaneText, guard, openPage, snap } from '../helpers';

const ANCHORS = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];

test.describe('Pro tools (qa2)', () => {
  test.use({ storageState: AUTH.pro });

  test('Flow Radar Pro: real-time, LOW available, Flow Balance panel, every coin', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/pro?tab=flowradar');
    await expect(page.getByRole('heading', { name: /Flow Radar Pro/ })).toBeVisible();
    await expect(page.getByText(/Delayed \d+m/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'LOW', exact: true })).toBeVisible();
    await expect(page.locator('[data-tour="fr-balance"]')).toBeVisible();
    await expectSaneText(page);
    const { body } = await apiAsUser<{ delayed: boolean; events: { ts: string; asset: string }[] }>(page, '/api/market/flow-radar?view=pro');
    expect(body.delayed).toBe(false);
    if (body.events.length) {
      const newest = Math.max(...body.events.map((e) => Date.parse(e.ts)));
      expect(Date.now() - newest, 'Pro feed looks delayed').toBeLessThan(15 * 60_000);
    }
    await snap(page, info, 'flowradar-pro');
    g.assertClean();
  });

  test('Watchlist Pro: anchors + add/remove your own coin + Also Worth Watching rules', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/pro?tab=watchlist');
    await expect(page.getByRole('heading', { name: /Watchlist Pro/ })).toBeVisible();
    await expect(page.locator('[data-tour="wl-table"] .w-wl-trow')).toHaveCount(5);

    const input = page.getByPlaceholder('Add a ticker (e.g. BTC)');
    await input.fill('DOGE');
    await page.getByRole('button', { name: /Pin/ }).click();
    await expect(page.getByText(/1\/15 assets tracked/)).toBeVisible({ timeout: 30_000 });
    // Desktop: the Status-column "Remove" button; phones: the × in the asset cell.
    const row = page.locator('.w-wl-trow').filter({ hasText: 'DOGE' });
    await row.getByRole('button', { name: /^(Remove|Remove DOGE)$/ }).filter({ visible: true }).first().click();
    await expect(page.getByText(/0\/15 assets tracked/)).toBeVisible({ timeout: 30_000 });

    const { body } = await apiAsUser<{ sectionC: { asset: string }[]; curatedSymbols: string[]; sectionCMode?: string; historyDays?: number }>(page, '/api/market/watchlist?view=pro');
    expect(body.sectionC.length).toBeLessThanOrEqual(5);
    for (const c of body.sectionC) {
      expect(ANCHORS, 'anchor in Also Worth Watching').not.toContain(c.asset);
      expect(body.curatedSymbols, 'pinned coin in Also Worth Watching').not.toContain(c.asset);
    }
    expect(['consistent', 'building']).toContain(body.sectionCMode);
    if (body.sectionCMode === 'building' && body.sectionC.length) {
      await expect(page.getByText(/building 7-day history \(\d\/7 days\)/)).toBeVisible();
    }
    await snap(page, info, 'watchlist-pro');
    g.assertClean();
  });

  test('Spot Pulse Pro: anchors first + up to 5 extra coins, live, 10-tile rules', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/pro?tab=spotpulse');
    await expect(page.getByText('Spot Pulse Pro').first()).toBeVisible();
    await expect(page.getByText(/delayed/i)).toHaveCount(0);
    const tiles = page.locator('.w-sp-tile .w-sp-sym');
    // Cold cache = 10 coins × 3 CoinGlass calls with rate-limit back-off — allow a realistic first load.
    await expect(tiles.first()).toBeVisible({ timeout: 60_000 });
    const syms = await tiles.allInnerTexts();
    expect(syms.length).toBeGreaterThanOrEqual(1);
    expect(syms.length).toBeLessThanOrEqual(10);
    const anchorsShown = syms.filter((s) => ANCHORS.includes(s));
    expect(syms.slice(0, anchorsShown.length), 'anchors must come first').toEqual(anchorsShown);
    const { body } = await apiAsUser<{ tiles: unknown[]; extraMode?: string; tier: string }>(page, '/api/market/spot-pulse?view=pro');
    expect(body.tier).toBe('pro');
    expect(body.extraMode).toBeDefined();
    for (const tf of ['24H', '7D', '4H']) {
      await page.getByRole('button', { name: tf, exact: true }).first().click();
      await expect(tiles.first()).toBeVisible({ timeout: 60_000 }); // cold cache per timeframe
    }
    await snap(page, info, 'spotpulse-pro');
    g.assertClean();
  });
});
