/**
 * QA — coins show their real logo (self-hosted in public/coins/, see
 * scripts/fetch-coin-logos.ts) instead of a coloured letter (Andrew, 10 Oct 2026).
 * A letter is only acceptable for coins outside the top-300 logo set.
 */
import { expect, test, type Page } from '@playwright/test';
import { AUTH, guard, openPage, snap } from '../helpers';
import { COIN_LOGO_FILES } from '../../src/lib/coin-logos.generated';

/** Every coin badge on the page: real logos must have loaded; letters only for coins we have no logo for. */
async function checkBadges(page: Page, min: number) {
  await expect.poll(() => page.locator('img.w-coin').count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(min);
  const broken = await page.locator('img.w-coin').evaluateAll((els) =>
    (els as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
  expect(broken, 'logo images that failed to load').toEqual([]);
  // Round, not oval: every badge is as wide as it is tall.
  const ovals = await page.locator('img.w-coin, span.w-coin').evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && Math.abs(r.width - r.height) > 0.5)
      .map((r) => `${r.width.toFixed(1)}×${r.height.toFixed(1)}`));
  expect(ovals, 'coin badges that are not square (oval logos)').toEqual([]);
  const letters = await page.locator('span.w-coin').allInnerTexts();
  const symbolsWithLetters = await page.locator('span.w-coin').evaluateAll((els) =>
    els.map((e) => e.closest('[class]')?.parentElement?.textContent ?? ''));
  for (const [i, l] of letters.entries()) {
    // A letter badge is fine only if no logo exists for any ticker next to it.
    const ctx = symbolsWithLetters[i];
    const known = Object.keys(COIN_LOGO_FILES).find((s) => s.startsWith(l) && new RegExp(`\b${s}\b`).test(ctx));
    expect(known, `letter "${l}" shown although we have a logo (${ctx.slice(0, 60)})`).toBeUndefined();
  }
}

test.describe('Coin logos', () => {
  for (const [role, path, min, name] of [
    ['plus', '/world/console', 3, 'console'],
    ['plus', '/world/watchlist', 5, 'watchlist-plus'],
    ['plus', '/world/onchain', 1, 'onchain'],
    ['plus', '/world/flow-radar', 1, 'flow-radar-plus'],
    ['pro', '/world/pro?tab=watchlist', 5, 'watchlist-pro'],
  ] as const) {
    test(`${name}: real logos, no letter placeholders for known coins`, async ({ browser }, info) => {
      const ctx = await browser.newContext({ storageState: AUTH[role] });
      const page = await ctx.newPage();
      const g = guard(page);
      await openPage(page, path);
      await checkBadges(page, min);
      await snap(page, info, `coin-logos-${name}`);
      g.assertClean();
      await ctx.close();
    });
  }
});
