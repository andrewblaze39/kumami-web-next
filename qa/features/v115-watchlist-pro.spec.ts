/**
 * QA — Watchlist Pro v1.15 (Rachelle Pro §19): pin rules, 3-day Section C, live prices.
 */
import { expect, test } from '@playwright/test';
import { AUTH, apiAsUser, expectSaneText, guard, openPage, snap } from '../helpers';

type Resp = { sectionC: { asset: string; reasons: string[] }[]; curatedSymbols: string[]; sectionCMode?: string; historyDays?: number };

test.describe('Watchlist Pro v1.15 (qa2)', () => {
  test.use({ storageState: AUTH.pro });

  test('pin rules: liquid coin OK; core, stablecoin and illiquid refused with the spec message', async ({ page }, info) => {
    test.setTimeout(180_000);
    const g = guard(page);
    await openPage(page, '/world/pro?tab=watchlist');
    const input = page.getByPlaceholder('Add a ticker (e.g. BTC)');
    const pin = async (sym: string) => { await input.fill(sym); await page.getByRole('button', { name: /Pin/ }).click(); };

    await pin('USDC');
    await expect(page.getByText("Stablecoins and wrapped tokens can't be pinned.")).toBeVisible({ timeout: 30_000 });
    await pin('BTC');
    await expect(page.getByText(/BTC is a core asset/)).toBeVisible({ timeout: 30_000 });
    await pin('ZZZQ');
    await expect(page.getByText('Not enough liquidity to track reliably.')).toBeVisible({ timeout: 30_000 });

    await pin('LINK'); // liquid, has futures — was also allowed before
    await expect(page.getByText(/1\/15 assets tracked/)).toBeVisible({ timeout: 30_000 });
    await pin('PEPE'); // not on the old 10-coin allowlist, but liquid
    await expect(page.getByText(/2\/15 assets tracked/)).toBeVisible({ timeout: 30_000 });
    await snap(page, info, 'v115-watchlist-pins');

    for (const sym of ['LINK', 'PEPE']) {
      const row = page.locator('.w-wl-trow').filter({ hasText: sym });
      await row.getByRole('button', { name: new RegExp(`^(Remove|Remove ${sym})$`) }).filter({ visible: true }).first().click();
    }
    await expect(page.getByText(/0\/15 assets tracked/)).toBeVisible({ timeout: 30_000 });
    // The three refusals are deliberate 400s; Binance's socket closing on navigation is noise.
    g.assertClean([/400 .*\/api\/market\/watchlist/, /status of 400/, /stream\.binance\.com/]);
  });

  test('Section C: 3-day rule, ≤ 5, no padding, honest building label; live Binance prices', async ({ page }, info) => {
    test.setTimeout(180_000);
    const sockets: string[] = [];
    page.on('websocket', (ws) => sockets.push(ws.url()));
    const g = guard(page);
    await openPage(page, '/world/pro?tab=watchlist');
    const { body } = await apiAsUser<Resp>(page, '/api/market/watchlist?view=pro');
    expect(body.sectionC.length).toBeLessThanOrEqual(5);
    expect(['consistent', 'building']).toContain(body.sectionCMode);
    for (const c of body.sectionC) {
      expect(c.reasons[0]).toMatch(/^Accumulating [23] of \d days$/);
      expect(c.reasons[1]).toMatch(/^net flow \+\$\d+(\.\d)?[KMB] · spot buyers \+\$\d+(\.\d)?[KMB] \(3d\)$/);
    }
    await expect(page.getByText(/3-day net accumulation/)).toBeVisible();
    if (body.sectionC.length < 5) await expect(page.getByText(/sustained accumulation right now/)).toBeVisible();
    await expect.poll(() => sockets.some((u) => u.includes('stream.binance.com')), { timeout: 20_000 }).toBe(true);
    await expectSaneText(page);
    await snap(page, info, 'v115-watchlist-sectionc');
    g.assertClean([/stream\.binance\.com/]);
    await info.attach('sectionC', { body: JSON.stringify(body, null, 1).slice(0, 3000), contentType: 'application/json' });
  });
});
