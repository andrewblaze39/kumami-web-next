/**
 * v1.18 release notes, item 3 (Pro §18): illiquid-coin filter with Binance fallback.
 * Screenshot of the Flow Radar Pro coin filter row (only coins with real volume). kumami-dev only.
 *
 *   QA_PORT=3300 npx playwright test qa/features/v118-item3-illiquid-filter.spec.ts --project=desktop
 */
import path from 'node:path';
import { test } from '@playwright/test';
import { AUTH } from '../helpers';

const DIR = path.join(__dirname, '..', '..', 'docs', 'qa', 'evidence', 'v1.18');
test.use({ storageState: AUTH.pro, viewport: { width: 1440, height: 1000 } });

test('Flow Radar Pro coin filter row', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/world/pro?tab=flowradar');
  await page.locator('[data-tour="fr-verdict"]').waitFor({ state: 'visible', timeout: 120_000 });
  for (const name of [/^skip$/i, /got it/i, /accept/i, /close/i]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  await page.getByRole('button', { name: '24H', exact: true }).first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(DIR, 'item3-flow-radar-pro-coins.jpg'), type: 'jpeg', quality: 80, clip: { x: 270, y: 140, width: 1150, height: 360 } });
});
