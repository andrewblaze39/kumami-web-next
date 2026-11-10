/**
 * Price-alert toasts (v1.18 Following & Alerts): when several alerts fire in the same collector
 * run, every one of them shows (Sonner stack), not only the newest. kumami-dev only; the [TEST]
 * notifications written here are deleted afterwards.
 *
 *   QA_PORT=3301 npx playwright test qa/features/alert-toasts.spec.ts --project=desktop
 */
import { expect, test } from '@playwright/test';
import { AUTH, openPage } from '../helpers';
import { deleteQaDocs, QA_PREFIX } from '../admin-data';
import { admin, readPersonas } from '../personas';

const clear = () => deleteQaDocs('notifications', 'title', [QA_PREFIX]);

test.use({ storageState: AUTH.pro });

test('three alerts fired at once show three toasts', async ({ page }) => {
  test.setTimeout(120_000);
  await clear();
  const uid = readPersonas().qa2.uid!;
  await openPage(page, '/world/pro?tab=followhub');
  await page.waitForTimeout(3_000); // the notifications listener is attached

  const now = Date.now();
  const batch = admin().db.batch();
  for (const [i, coin] of ['BTC', 'ETH', 'SOL'].entries()) {
    batch.set(admin().db.collection('notifications').doc(), {
      userId: uid, kind: 'price_alert', read: false, createdAt: now + i,
      title: `${QA_PREFIX} ${coin} alert`, message: `${coin} price rises above $1`,
    });
  }
  await batch.commit();

  const toasts = page.locator('.w-alert-toast');
  await expect(toasts).toHaveCount(3, { timeout: 20_000 });
  await toasts.first().hover();
  await page.screenshot({ path: 'qa/artifacts/alert-toasts-stacked.png' });

  // dismiss one: the other two stay
  await toasts.filter({ hasText: 'SOL alert' }).getByRole('button', { name: 'Dismiss alert' }).click();
  await expect(toasts).toHaveCount(2, { timeout: 5_000 });
  await clear();
});
