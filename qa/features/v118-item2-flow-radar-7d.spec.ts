/**
 * v1.18 release notes, item 2 (Pro §18): Flow Radar Pro 7D window uses ×10 thresholds.
 * Opens Flow Radar Pro as qa2, reads the API payload, clicks each window and records
 * the verdict + stat line, and saves screenshots as evidence. kumami-dev only.
 *
 *   QA_PORT=3300 npx playwright test qa/features/v118-item2-flow-radar-7d.spec.ts --project=desktop
 */
import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { AUTH } from '../helpers';

const DIR = path.join(__dirname, '..', '..', 'docs', 'qa', 'evidence', 'v1.18');

test.use({ storageState: AUTH.pro, viewport: { width: 1440, height: 1000 } });

test('Flow Radar Pro verdict per window', async ({ page }) => {
  test.setTimeout(240_000);
  let payload: unknown = null;
  page.on('response', async (r) => {
    if (r.url().includes('/api/market/flow-radar')) {
      try { payload = { status: r.status(), body: await r.json() }; } catch { /* ignore */ }
    }
  });
  await page.goto('/world/pro?tab=flowradar');
  const band = page.locator('[data-tour="fr-verdict"]');
  await band.waitFor({ state: 'visible', timeout: 120_000 });
  for (const name of [/^skip$/i, /got it/i, /accept/i, /close/i]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  const out: Record<string, string> = {};
  for (const tf of ['1H', '4H', '24H', '7D']) {
    await page.getByRole('button', { name: tf, exact: true }).first().click();
    await page.waitForTimeout(800);
    out[tf] = (await band.innerText()).replace(/\s+/g, ' ').trim();
    if (tf === '7D') await page.screenshot({ path: path.join(DIR, 'item2-flow-radar-pro-7d.jpg'), type: 'jpeg', quality: 75 });
  }
  const p = payload as { status: number; body: { events?: { ts: string; type?: string; usd?: number; side?: string }[] } } | null;
  const events = p?.body?.events ?? [];
  const summary = {
    apiStatus: p?.status,
    eventCount: events.length,
    oldest: events.map((e) => e.ts).sort()[0],
    newest: events.map((e) => e.ts).sort().at(-1),
    sampleKeys: events[0] ? Object.keys(events[0]) : [],
    verdicts: out,
  };
  fs.writeFileSync(path.join(DIR, 'item2-flow-radar-7d.json'), JSON.stringify({ summary, payload }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
});
