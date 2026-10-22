/**
 * QA — workspace toggle words only, no mobile bottom bar (Andrew, 22 Oct 2026).
 */
import { expect, test } from '@playwright/test';
import { AUTH, guard, openPage, snap } from '../helpers';

test.use({ storageState: AUTH.plus });

test('Basic / Plus / Pro are words, no icons; no bottom tab bar', async ({ page }, info) => {
  const g = guard(page);
  await openPage(page, '/world/console');
  const sw = page.locator('.w-mode-switch');
  for (const w of ['Basic', 'Plus', 'Pro']) await expect(sw.getByRole('button', { name: new RegExp(w) })).toBeVisible();
  for (const w of ['Basic', 'Plus', 'Pro']) await expect(sw.locator('button', { hasText: w }).locator('span').first()).toBeVisible();
  await expect(sw.locator('button svg:not(.w-lock-glyph)')).toHaveCount(0);
  await expect(page.locator('.w-mobile-tabbar')).toHaveCount(0);
  await snap(page, info, 'shell-toggle');
  g.assertClean();
});
