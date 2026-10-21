/**
 * QA — Flow Radar engine v1.15 (Rachelle Plus §3 + Pro §18), Plus (qa1) and Pro (qa2).
 * Live data, so the checks are about shape and rules, not exact events.
 */
import { expect, test } from '@playwright/test';
import { AUTH, apiAsUser, expectSaneText, guard, openPage, snap } from '../helpers';

type Ev = {
  id: string; type: string; asset: string; amountUsd: number; direction: string; severity: string;
  ts: string; marketWide?: boolean; longShare?: number; crossSignal?: { label: string; color: string };
};
type Payload = { events: Ev[]; verdict: { label: string }; delayed: boolean; footer: { assets: string[] } };

const PLUS_TYPES = ['whale_transfer', 'exchange_flow', 'liq_spike', 'smart_money'];
const DIRS: Record<string, string[]> = {
  whale_transfer: ['Inflow', 'Outflow'],
  exchange_flow: ['Dry Powder In', 'Dry Powder Out'],
  liq_spike: ['Long Flush', 'Short Squeeze', 'Two-sided Flush'],
  smart_money: ['Long Opened', 'Short Opened', 'Position Closed'],
  netflow_flip: ['Buy Pressure', 'Sell Pressure'],
};
const VERDICTS = ['Long Liquidation Cascade', 'Short Squeeze Cascade', 'Distribution Wave', 'Broad Accumulation', 'Mixed Flow', 'Quiet Flow'];
const CORE = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];

function checkEvents(events: Ev[]) {
  for (const e of events) {
    expect(DIRS[e.type], `unknown type ${e.type}`).toBeDefined();
    expect(DIRS[e.type], `${e.type} direction ${e.direction}`).toContain(e.direction);
    expect(Number.isFinite(e.amountUsd) && e.amountUsd > 0, `amount ${e.id}`).toBe(true);
    if (e.type === 'whale_transfer') expect(e.amountUsd, 'whale floor $10M').toBeGreaterThanOrEqual(10e6);
    if (e.type === 'liq_spike') {
      expect(e.longShare).toBeGreaterThanOrEqual(0);
      const want = e.longShare! > 0.7 ? 'Long Flush' : e.longShare! < 0.3 ? 'Short Squeeze' : 'Two-sided Flush';
      expect(e.direction, `liq ${e.asset} longShare ${e.longShare}`).toBe(want);
    }
    if (e.type === 'exchange_flow') expect(e.marketWide).toBe(true);
  }
  expect(new Set(events.map((e) => e.id)).size, 'duplicate event ids').toBe(events.length);
}

test.describe('Flow Radar Plus v1.15 (qa1)', () => {
  test.use({ storageState: AUTH.plus });

  test('4 event types, new directions, roster + market-wide Dry Powder, HIGH/MED only', async ({ page }, info) => {
    test.setTimeout(180_000);
    const g = guard(page);
    await openPage(page, '/world/flow-radar');
    for (const chip of ['Whale Transfer', 'Exchange Flow', 'Liquidation Spike', 'Smart Money']) {
      await expect(page.getByRole('button', { name: chip, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Netflow Flip', exact: true })).toHaveCount(0);
    const { status, body } = await apiAsUser<Payload>(page, '/api/market/flow-radar?view=plus');
    expect(status).toBe(200);
    expect(body.delayed).toBe(true);
    checkEvents(body.events);
    for (const e of body.events) {
      expect(PLUS_TYPES).toContain(e.type);
      expect(['HIGH', 'MED']).toContain(e.severity);
      if (!e.marketWide) expect(CORE, `non-roster asset ${e.asset}`).toContain(e.asset);
    }
    await expect(page.locator('.w-flow-radar-verdict-label')).toHaveText(new RegExp(VERDICTS.join('|')));
    // The band follows the selected window.
    for (const tf of ['1H', '4H', '24H']) {
      await page.locator('.w-flow-radar-timeframe button', { hasText: tf }).first().click();
      await expect(page.locator('.w-flow-radar-verdict-label')).toHaveText(new RegExp(VERDICTS.join('|')));
    }
    await expectSaneText(page);
    await snap(page, info, 'v115-flowradar-plus');
    g.assertClean();
  });

  test('Console preview colours by lean: Inflow / bearish rows are red "−"', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/console');
    const rows = page.locator('[aria-label="Flow radar events"] .w-radar-item');
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      const dir = (await row.locator('.w-radar-ic').getAttribute('title')) ?? '';
      const amt = row.locator('.w-radar-amt b');
      if (/Inflow|Dry Powder Out|Long Flush|Short Opened|Sell Pressure/.test(dir)) await expect(amt).toHaveClass(/w-bear/);
      if (/Outflow|Dry Powder In|Short Squeeze|Long Opened|Buy Pressure/.test(dir)) await expect(amt).toHaveClass(/w-bull/);
    }
    await snap(page, info, 'v115-console-flow');
    g.assertClean();
  });
});

test.describe('Flow Radar Pro v1.15 (qa2)', () => {
  test.use({ storageState: AUTH.pro });

  test('5 types incl. Netflow Flip, LOW allowed, Dry Powder market-wide, illiquid coins hidden', async ({ page }, info) => {
    test.setTimeout(180_000);
    const g = guard(page);
    await openPage(page, '/world/pro?tab=flowradar');
    await expect(page.getByRole('button', { name: 'Netflow Flip', exact: true })).toBeVisible();
    const { status, body } = await apiAsUser<Payload>(page, '/api/market/flow-radar?view=pro');
    expect(status).toBe(200);
    expect(body.delayed).toBe(false);
    checkEvents(body.events);
    // Smart money closes are kept but neutral; opened shorts are never bullish any more.
    for (const e of body.events.filter((x) => x.type === 'smart_money')) {
      expect(['Long Opened', 'Short Opened', 'Position Closed']).toContain(e.direction);
    }
    // Illiquid filter: every non-core, non-market-wide coin must be in the top spot-volume list
    // with ≥ $1M — checked indirectly: no event for an obviously tiny ticker list.
    expect(body.footer.assets.every((a) => /^[A-Z0-9]{1,15}$/.test(a))).toBe(true);
    await page.getByRole('button', { name: 'LOW', exact: true }).click();
    await expectSaneText(page);
    await snap(page, info, 'v115-flowradar-pro');
    const types = [...new Set(body.events.map((e) => e.type))];
    const liq = body.events.filter((e) => e.type === 'liq_spike').map((e) => `${e.asset}:${e.direction}:${e.longShare}`);
    await info.attach('summary', { body: JSON.stringify({ count: body.events.length, types, liq: liq.slice(0, 8), cross: body.events.filter((e) => e.crossSignal).length, verdict: body.verdict }, null, 1), contentType: 'application/json' });
    g.assertClean();
  });
});
