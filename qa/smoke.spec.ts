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
  // KNOWN ISSUE (reported 10 Oct 2026): Exchange Netflow on the 24H range reads "$0 out · Neutral"
  // because CoinGlass exchange balances update once a day — the 24H window compares a value with
  // itself. Rachelle's spec says daily cadence / 7D default. Remove once the panel handles it.
  'plus:/world/onchain': [/\$0/],
  // KNOWN DATA ISSUE (kumami-dev): Alpha Room has "Lorem Ipsum" test messages.
  // Delete them at /admin/alpha-room, then remove this allowance.
  'pro:alpha': [/lorem ipsum/i],
};

const PRO_TABS = [
  'digest', 'followhub', 'flowradar', 'watchlist', 'realtimenews', 'alpha', 'research', 'market',
  'spotpulse', 'scanner', 'marketcap', 'airdrops', 'portfolio', 'addresstracker', 'kumaai', 'events',
];

test.describe('Plus pages (QA1 free account)', () => {
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

test.describe('Pro tabs (QA2 Pro account)', () => {
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

});

test.describe('Pro admin pages (QA3 admin account)', () => {
  test.use({ storageState: AUTH.admin });
  for (const p of ['pro-research', 'pro-airdrops', 'pro-calendar', 'pro-news', 'pro-events']) {
    test(`admin page loads: /admin/${p}`, async ({ page }, info) => {
      const g = guard(page);
      await openPage(page, `/admin/${p}`, { ready: 'form' });
      await snap(page, info, `admin_${p}`);
      g.assertClean();
    });
  }
});
