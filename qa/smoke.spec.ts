/**
 * Smoke / regression suite — every Plus page as the Plus account, every Pro
 * tab as the Pro account. Each page must: load past its skeletons, log no
 * console/page errors, have no failed /api calls, and show no placeholder or
 * broken values. Run before every push (kumami-qa stage 5, "regression").
 */
import { test } from '@playwright/test';
import { AUTH, expectSaneText, guard, openPage, snap } from './helpers';

const PLUS_PAGES = [
  '/world/console',
  '/world/onchain',
  '/world/flow-radar',
  '/world/fear-greed',
  '/world/calendar',
  '/world/watchlist',
  '/world/settings',
];

/**
 * Per-page allowances for text that LOOKS broken but is legitimate. Keep each
 * one justified — and list data problems here only while they're being fixed.
 */
const ALLOW_TEXT: Record<string, RegExp[]> = {
  // "POTENTIAL GAIN 18.8× ▲ 1779.2%" — big %s are the point of this tool.
  'pro:marketcap': [/\d+(?:\.\d+)?%/],
  // The QA Pro account holds no assets: "$0 · +$0 last 24h" is the honest empty state.
  'pro:portfolio': [/\$0/],
  // KNOWN DATA ISSUE (kumami-dev): Alpha Room has "Lorem Ipsum" test messages.
  // Delete them at /admin/alpha-room, then remove this allowance.
  'pro:alpha': [/lorem ipsum/i],
};

const PRO_TABS = [
  'digest', 'followhub', 'realtimenews', 'alpha', 'research', 'market',
  'spotpulse', 'scanner', 'marketcap', 'airdrops', 'portfolio', 'addresstracker', 'kumaai', 'events',
];

test.describe('Plus pages (QA Plus account)', () => {
  test.use({ storageState: AUTH.plus });
  for (const path of PLUS_PAGES) {
    test(`loads cleanly: ${path}`, async ({ page }, info) => {
      const g = guard(page);
      await openPage(page, path);
      await expectSaneText(page, ALLOW_TEXT[`plus:${path}`]);
      await snap(page, info, `plus${path.replace(/\//g, '_')}`);
      g.assertClean();
    });
  }
});

test.describe('Pro tabs (QA Pro account)', () => {
  test.use({ storageState: AUTH.pro });
  for (const tab of PRO_TABS) {
    test(`loads cleanly: /world/pro?tab=${tab}`, async ({ page }, info) => {
      const g = guard(page);
      await openPage(page, `/world/pro?tab=${tab}`);
      await expectSaneText(page, ALLOW_TEXT[`pro:${tab}`]);
      await snap(page, info, `pro_${tab}`);
      g.assertClean();
    });
  }

  test('admin calendar page loads', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/admin/pro-calendar', { ready: 'text=Scheduled events' });
    await snap(page, info, 'admin_pro-calendar');
    g.assertClean();
  });
});
