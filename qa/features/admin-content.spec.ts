/**
 * QA — admin-managed Plus & Pro content, end to end (Andrew, 10 Oct 2026).
 *
 * qa3 (superadmin) authors believable items through the real /admin forms —
 * every text starts with "[TEST]" — then:
 *   qa2 (Pro)  must see each one rendered correctly (badges, details, checklist,
 *              follow, live event + Q&A, replay, Daily Digest roll-up), drafts hidden,
 *              edits applied, deleted items gone;
 *   qa1 (free) must see the Pro teaser and none of the [TEST] Pro content
 *              (the team Calendar is Plus, so qa1 does see that).
 *
 * Each type: publish the main item(s), save a draft, publish a spare → edit it →
 * delete it. The main items and drafts are KEPT after the run so Andrew can look
 * at them; the next run's global-setup deletes every "[TEST]" item first.
 * Tickers (ETH, BTC…) and dropdown values are left as-is — only free text gets [TEST].
 */
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { AUTH, expectSaneText, guard, openPage, snap, type Role } from '../helpers';
import { TEST_IMAGE } from '../personas';

// Tests run in file order on one worker; a failure doesn't stop the rest (later checks still report).
test.skip(({ isMobile }) => isMobile, 'authoring runs once on desktop; qa2 views are screenshotted there');

async function as<T>(browser: Browser, role: Role, fn: (page: Page) => Promise<T>): Promise<T> {
  const ctx = await browser.newContext({ storageState: AUTH[role] });
  const page = await ctx.newPage();
  try { return await fn(page); } finally { await ctx.close(); }
}

/** Admin form fields are "label + control" pairs without for/id — find the control by its label text. */
const field = (scope: Page | Locator, label: string) =>
  scope.locator(`xpath=.//div[label[normalize-space(.)="${label}"]]`).locator('input:not([type="checkbox"]), textarea, select').first();

const adminRow = (page: Page, text: string) => page.locator('div.border').filter({ hasText: text }).first();

async function openAdmin(page: Page, path: string) {
  page.on('dialog', (d) => d.accept()); // delete confirms / publish alerts
  await openPage(page, path, { ready: 'form' });
}

/**
 * Click a form button and wait for the save to finish: the success message shows AND
 * the form has reset (first field empty). The message alone isn't enough — the
 * previous save's identical message may still be on screen.
 */
async function submit(page: Page, button: string | RegExp, message: string, firstField: string) {
  await page.getByRole('button', { name: button }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(field(page, firstField)).toHaveValue('', { timeout: 20_000 });
}

async function expectMessage(page: Page, text: string) {
  await expect(page.getByText(text, { exact: true })).toBeVisible({ timeout: 20_000 });
}

async function openPro(page: Page, tab: string) {
  await openPage(page, `/world/pro?tab=${tab}`);
  await expect(page.locator('.w-pro-teaser'), `qa2 is Pro — ${tab} must not show the teaser`).toHaveCount(0);
}

/** qa1 (free): Pro tab shows the teaser and no [TEST] text at all. */
async function expectLockedForFree(browser: Browser, tab: string) {
  await as(browser, 'plus', async (page) => {
    await openPage(page, `/world/pro?tab=${tab}`);
    await expect(page.locator('.w-pro-teaser')).toBeVisible();
    await expect(page.getByText('[TEST]')).toHaveCount(0);
  });
}

// ---------------------------------------------------------------------------
// Content (believable, every free-text value starts with [TEST])
// ---------------------------------------------------------------------------

const RESEARCH = {
  name: '[TEST] Mira Tanaka',
  role: '[TEST] Senior Analyst, Kumami Research',
  pos: 'long',
  asset: 'ETH',
  body: '[TEST] ETH has held the $3,200 support after three retests while exchange balances keep falling. We are opening a long with a stop under $3,050 and a first target at $3,650.',
  forYou: '[TEST] If you already hold ETH this is a hold-and-add signal, not a reason to chase. Keep new positions small until $3,400 breaks.',
};
const RESEARCH_DRAFT = { name: '[TEST] Draft — Jonas Weber (must stay hidden)', body: '[TEST] Unfinished SOL short thesis.', pos: 'short', asset: 'SOL' };
const RESEARCH_SPARE = { name: '[TEST] Spare call — Leo Park', edited: '[TEST] Spare call — Leo Park (edited)', body: '[TEST] BTC range trade between $66k and $70k.', pos: 'neutral', asset: 'BTC' };

const AIRDROP = {
  name: '[TEST] Lumen Network Airdrop', cat: 'airdrop', elig: 'eligible', color: '#7c5cff',
  desc: '[TEST] Lumen is rewarding early testnet users ahead of its mainnet launch. Bridge at least 0.05 ETH and complete two swaps to qualify.',
  deadline: '[TEST] 5d 12h', val: '[TEST] $250–600 est.',
  checklist: [
    { t: '[TEST] Bridged 0.05 ETH to the Lumen testnet', ok: true },
    { t: '[TEST] Completed 2 swaps on LumenSwap', ok: true },
    { t: '[TEST] Joined the Discord and verified your wallet', ok: false },
  ],
};
const WHITELIST = {
  name: '[TEST] Orbit Pass Whitelist', cat: 'whitelist', elig: 'check', color: '#00c2c7',
  desc: '[TEST] Orbit is opening 2,000 whitelist spots for its genesis NFT mint. Follow the project and submit your wallet before the snapshot.',
  deadline: '[TEST] 2d 4h', val: '[TEST] Mint price 0.08 ETH',
  checklist: [
    { t: '[TEST] Wallet holds at least 0.1 ETH', ok: true },
    { t: '[TEST] Submitted the whitelist form', ok: false },
  ],
};
const AIRDROP_DRAFT = { name: '[TEST] Draft — Nova Airdrop (must stay hidden)', desc: '[TEST] Details still being confirmed.' };
const AIRDROP_SPARE = { name: '[TEST] Spare airdrop — Delta Swap', edited: '[TEST] Spare airdrop — Delta Swap (edited)', desc: '[TEST] Temporary entry used to check edit and delete.' };

const NEWS = {
  title: '[TEST] SEC opens review of the first spot SOL ETF filings', sentiment: 'bull', sentLabel: 'Bullish',
  source: '[TEST] Reuters', summary: '[TEST] The agency has 240 days to decide; analysts expect inflows similar to the ETH ETF launch.',
  tags: '[TEST] Important, [TEST] Regulation',
};
const NEWS_DRAFT = { title: '[TEST] Draft headline (must stay hidden)' };
const NEWS_SPARE = { title: '[TEST] Spare headline — exchange outflows hit a 6-month high', edited: '[TEST] Spare headline (edited)', sentiment: 'bear', sentLabel: 'Bearish' };

const VIDEO = 'jNQXAC9IVRw'; // a long-lived public YouTube video
const EVENT_LIVE = { title: '[TEST] Live AMA: Kumami Research on the ETH setup', date: '[TEST] Oct 12 · 3:00 PM UTC', host: '[TEST] Kumami Research', status: 'upcoming', live: true, video: `https://www.youtube.com/watch?v=${VIDEO}` };
const EVENT_UPCOMING = { title: '[TEST] Upcoming: Airdrop hunting workshop', date: '[TEST] Oct 18 · 1:00 PM UTC', host: '[TEST] Kumami Academy', status: 'upcoming', live: false, video: '' };
const EVENT_PAST = { title: '[TEST] Replay: Weekly market wrap #42', date: '[TEST] Oct 3 · 2:00 PM UTC', host: '[TEST] Kumami Research', status: 'past', live: false, video: VIDEO };
const EVENT_DRAFT = { title: '[TEST] Draft event (must stay hidden)' };
const EVENT_SPARE = { title: '[TEST] Spare event — Q4 outlook', edited: '[TEST] Spare event — Q4 outlook (edited)' };
const QUESTION = '[TEST] What is the invalidation level for the ETH long?';

const inDays = (d: number) => { const t = new Date(Date.now() + d * 86_400_000); return t.toISOString().slice(0, 10); };
const CAL_HIGH = { t: '[TEST] Kumami Pro AMA: Q4 market outlook', date: inDays(2), time: '14:00', imp: 'high', cat: 'Project', assets: 'BTC, ETH', d: '[TEST] Live Q&A with the research team on positioning into Q4.' };
const CAL_MED = { t: '[TEST] Lumen Network mainnet launch', date: inDays(4), time: '', imp: 'med', cat: 'On-chain', assets: 'ETH', d: '[TEST] Mainnet goes live; the airdrop snapshot follows 24h later.' };
const CAL_DRAFT = { t: '[TEST] Draft calendar event (must stay hidden)', date: inDays(3), time: '', imp: 'low', cat: 'Other', assets: '', d: '[TEST] Not confirmed yet.' };

const ALPHA = '[TEST] BTC reclaimed the weekly open at $67.4k — watching $69k as the next resistance. Not financial advice.';

const ANALYSIS = {
  title: '[TEST] ETH weekly: higher lows into the $3,650 test',
  content: '[TEST] ETH has printed three higher lows since the September bottom, and the 8-week average has turned up. A weekly close above $3,650 opens the way to $4,000; losing $3,200 would invalidate the setup.',
};

// ---------------------------------------------------------------------------
// 1 · Kumami Research
// ---------------------------------------------------------------------------

test.describe('Kumami Research', () => {
  async function fill(page: Page, r: { name: string; role?: string; pos: string; asset: string; body: string; forYou?: string }) {
    await field(page, 'Analyst name').fill(r.name);
    await field(page, 'Role / title').fill(r.role ?? '');
    await field(page, 'Position').selectOption(r.pos);
    await field(page, 'Asset / ticker').fill(r.asset);
    await field(page, 'The call').fill(r.body);
    await field(page, 'What this means for you').fill(r.forYou ?? '');
  }

  test('qa3 publishes a call, saves a draft, edits a spare', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      const g = guard(page);
      await openAdmin(page, '/admin/pro-research');
      await fill(page, RESEARCH);
      await submit(page, /^Publish$/, 'Research call published!', 'Analyst name');
      await fill(page, RESEARCH_DRAFT);
      await submit(page, /^Save Draft$/, 'Draft saved.', 'Analyst name');
      await page.waitForTimeout(1100); // createdAt has 1-second resolution in the tab's newest-first sort
      await fill(page, RESEARCH_SPARE);
      await submit(page, /^Publish$/, 'Research call published!', 'Analyst name');
      await adminRow(page, RESEARCH_SPARE.name).getByRole('button', { name: 'Edit' }).click();
      await expect(field(page, 'Analyst name')).toHaveValue(RESEARCH_SPARE.name);
      await field(page, 'Analyst name').fill(RESEARCH_SPARE.edited);
      await submit(page, 'Update & Publish', 'Research call updated.', 'Analyst name');
      g.assertClean();
    });
  });

  test('qa2 sees the call laid out correctly; draft hidden; edit applied', async ({ browser }, info) => {
    await as(browser, 'pro', async (page) => {
      const g = guard(page);
      await openPro(page, 'research');
      const card = page.locator('.ma-card').filter({ hasText: RESEARCH.name });
      await expect(card).toHaveCount(1);
      await expect(card.locator('.ma-name')).toHaveText(RESEARCH.name);
      await expect(card.locator('.ma-role')).toHaveText(RESEARCH.role);
      await expect(card.locator('.ma-pos')).toHaveText(`long ${RESEARCH.asset}`);
      await expect(card.locator('.ma-pos')).toHaveClass(/\blong\b/);
      await expect(card.locator('.ma-time')).toHaveText(/^\d+m ago$/);
      await expect(card.locator('.ma-body')).toHaveText(RESEARCH.body);
      await expect(card.locator('.ma-premium')).toContainText('What this means for you');
      await expect(card.locator('.ma-premium')).toContainText(RESEARCH.forYou);
      // Newest first: the spare was published after the main call.
      await expect(page.locator('.ma-card .ma-name').first()).toHaveText(RESEARCH_SPARE.edited);
      await expect(page.getByText(RESEARCH_SPARE.name, { exact: true })).toHaveCount(0);
      await expect(page.getByText(RESEARCH_DRAFT.name)).toHaveCount(0);
      await expectSaneText(page);
      await snap(page, info, 'admin-content-research-qa2');
      g.assertClean();
    });
  });

  test('qa3 deletes the spare → gone for qa2; qa1 sees the teaser', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      await openAdmin(page, '/admin/pro-research');
      await adminRow(page, RESEARCH_SPARE.edited).getByRole('button', { name: 'Delete' }).click();
      await expectMessage(page, 'Research call deleted.');
    });
    await as(browser, 'pro', async (page) => {
      await openPro(page, 'research');
      await expect(page.getByText(RESEARCH.name, { exact: true })).toBeVisible();
      await expect(page.getByText(RESEARCH_SPARE.edited)).toHaveCount(0);
    });
    await expectLockedForFree(browser, 'research');
  });
});

// ---------------------------------------------------------------------------
// 2 · Airdrops & Whitelist
// ---------------------------------------------------------------------------

type Drop = { name: string; cat?: string; desc: string; deadline?: string; val?: string; elig?: string; color?: string; checklist?: { t: string; ok: boolean }[] };

test.describe('Airdrops & Whitelist', () => {
  async function fill(page: Page, a: Drop) {
    await field(page, 'Name').fill(a.name);
    await field(page, 'Category').selectOption(a.cat ?? 'airdrop');
    await field(page, 'Description').fill(a.desc);
    await field(page, 'Deadline').fill(a.deadline ?? '');
    await field(page, 'Estimated value').fill(a.val ?? '');
    await field(page, 'Eligibility').selectOption(a.elig ?? 'check');
    if (a.color) await page.locator('input[type="color"]').fill(a.color);
    for (const [i, row] of (a.checklist ?? []).entries()) {
      await page.getByRole('button', { name: '+ Add checklist item' }).click();
      await page.getByPlaceholder('Checklist item').nth(i).fill(row.t);
      await page.locator('input[title="Met?"]').nth(i).setChecked(row.ok);
    }
  }

  test('qa3 publishes an airdrop and a whitelist, saves a draft, edits a spare', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      const g = guard(page);
      await openAdmin(page, '/admin/pro-airdrops');
      for (const a of [AIRDROP, WHITELIST, AIRDROP_SPARE]) {
        await page.waitForTimeout(1100); // distinct createdAt seconds → stable newest-first order
        await fill(page, a);
        await submit(page, /^Publish$/, 'Airdrop published!', 'Name');
      }
      await fill(page, AIRDROP_DRAFT);
      await submit(page, /^Save Draft$/, 'Draft saved.', 'Name');
      await adminRow(page, AIRDROP_SPARE.name).getByRole('button', { name: 'Edit' }).click();
      await expect(field(page, 'Name')).toHaveValue(AIRDROP_SPARE.name);
      await field(page, 'Name').fill(AIRDROP_SPARE.edited);
      await submit(page, 'Update & Publish', 'Airdrop updated.', 'Name');
      // The admin list shows category + eligibility + status for each entry.
      await expect(adminRow(page, AIRDROP.name)).toContainText('airdrop');
      await expect(adminRow(page, AIRDROP.name)).toContainText('Eligible');
      await expect(adminRow(page, WHITELIST.name)).toContainText('whitelist');
      await expect(adminRow(page, AIRDROP_DRAFT.name)).toContainText('draft');
      g.assertClean();
    });
  });

  async function checkCard(page: Page, a: typeof AIRDROP, eligLabel: string) {
    const card = page.locator('.ad-card').filter({ hasText: a.name });
    await expect(card).toHaveCount(1);
    await expect(card.locator('h3')).toHaveText(a.name);
    await expect(card.locator('p')).toHaveText(a.desc);
    await expect(card.locator('.ad-elig')).toHaveText(eligLabel);
    await expect(card.locator('.ad-foot .cd')).toHaveText(a.deadline);
    await expect(card.locator('.ad-foot .val')).toHaveText(a.val);
    await expect(card.locator('.logo')).toHaveText(a.name.charAt(0));
    return card;
  }

  async function checkDetail(page: Page, a: typeof AIRDROP, eligLabel: string) {
    await expect(page.getByRole('heading', { name: a.name })).toBeVisible();
    await expect(page.locator('.ad-detail .ad-elig')).toHaveText(eligLabel);
    await expect(page.locator('.ad-detail')).toContainText('Eligibility checklist');
    const rows = page.locator('.ad-check-row');
    await expect(rows).toHaveCount(a.checklist.length);
    for (const [i, r] of a.checklist.entries()) {
      await expect(rows.nth(i)).toContainText(r.t);
      // ✓ rows are green (bull), ✗ rows red (bear)
      await expect(rows.nth(i).locator('span').first()).toHaveAttribute('style', new RegExp(r.ok ? 'var\\(--bull\\)' : 'var\\(--bear\\)'));
    }
    await expect(page.locator('.chart-side-row').filter({ hasText: 'Deadline' })).toContainText(a.deadline);
    await expect(page.locator('.chart-side-row').filter({ hasText: 'Estimated value' })).toContainText(a.val);
  }

  test('qa2: Airdrops and Whitelists tabs, cards, detail, checklist; draft hidden', async ({ browser }, info) => {
    await as(browser, 'pro', async (page) => {
      const g = guard(page);
      await openPro(page, 'airdrops');
      // Airdrops sub-tab: the airdrop + the edited spare, not the whitelist, not the draft.
      const card = await checkCard(page, AIRDROP, 'Eligible');
      await expect(page.locator('.ad-card').filter({ hasText: AIRDROP_SPARE.edited })).toHaveCount(1);
      await expect(page.locator('.ad-card').filter({ hasText: WHITELIST.name })).toHaveCount(0);
      await expect(page.getByText(AIRDROP_DRAFT.name)).toHaveCount(0);
      await expectSaneText(page);
      await snap(page, info, 'admin-content-airdrops-qa2');
      await card.click();
      await checkDetail(page, AIRDROP, 'Eligible');
      await snap(page, info, 'admin-content-airdrop-detail-qa2');
      await page.getByRole('button', { name: /Back to list/ }).click();

      await page.getByRole('button', { name: 'Whitelists', exact: true }).click();
      const wl = await checkCard(page, WHITELIST, 'Check eligibility');
      await expect(page.locator('.ad-card').filter({ hasText: AIRDROP.name })).toHaveCount(0);
      await snap(page, info, 'admin-content-whitelists-qa2');
      await wl.click();
      await checkDetail(page, WHITELIST, 'Check eligibility');
      g.assertClean();
    });
  });

  test('qa2 follows the airdrop → it is listed by name in Following & Alerts', async ({ browser }, info) => {
    await as(browser, 'pro', async (page) => {
      await openPro(page, 'airdrops');
      await page.locator('.ad-card').filter({ hasText: AIRDROP.name }).click();
      const follow = page.locator('.ad-detail .followbtn');
      if ((await follow.textContent())?.includes('Following')) await follow.click(); // leftover from an earlier run
      await expect(follow).toHaveText(/Follow$/);
      await follow.click();
      await expect(follow).toHaveText(/Following/);

      await openPro(page, 'followhub');
      const row = page.locator('.chart-side-row').filter({ has: page.locator('.followbtn.on') }).filter({ hasText: AIRDROP.name });
      await expect(row, 'the followed airdrop should be listed by its name').toHaveCount(1);
      await expect(row).toContainText(`${AIRDROP.name} · Airdrop`);
      await expect(page.getByText(/\(airdrop\)/), 'raw Firestore ids must never show').toHaveCount(0);
      await snap(page, info, 'admin-content-following-qa2');
      // Unfollow so the fixed qa2 account stays clean between runs.
      await row.getByRole('button', { name: /Following/ }).click();
      await expect(page.getByText(AIRDROP.name)).toHaveCount(0);
    });
  });

  test('qa3 deletes the spare → gone for qa2; qa1 sees the teaser', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      await openAdmin(page, '/admin/pro-airdrops');
      await adminRow(page, AIRDROP_SPARE.edited).getByRole('button', { name: 'Delete' }).click();
      await expectMessage(page, 'Airdrop deleted.');
    });
    await as(browser, 'pro', async (page) => {
      await openPro(page, 'airdrops');
      await expect(page.locator('.ad-card').filter({ hasText: AIRDROP.name })).toHaveCount(1);
      await expect(page.getByText(AIRDROP_SPARE.edited)).toHaveCount(0);
    });
    await expectLockedForFree(browser, 'airdrops');
  });
});

// ---------------------------------------------------------------------------
// 3 · Real-Time News
// ---------------------------------------------------------------------------

test.describe('Real-Time News', () => {
  async function fill(page: Page, n: { title: string; sentiment?: string; source?: string; summary?: string; tags?: string }) {
    await field(page, 'Headline').fill(n.title);
    await field(page, 'Sentiment').selectOption(n.sentiment ?? 'neutral');
    await field(page, 'Source (optional)').fill(n.source ?? '');
    await field(page, 'One-line summary (optional)').fill(n.summary ?? '');
    await field(page, 'Tags (comma-separated, optional)').fill(n.tags ?? '');
  }

  test('qa3 publishes a headline, saves a draft, edits a spare', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      const g = guard(page);
      await openAdmin(page, '/admin/pro-news');
      await fill(page, NEWS);
      await submit(page, /^Publish$/, 'Headline published!', 'Headline');
      await fill(page, NEWS_DRAFT);
      await submit(page, /^Save Draft$/, 'Draft saved.', 'Headline');
      await page.waitForTimeout(1100);
      await fill(page, NEWS_SPARE);
      await submit(page, /^Publish$/, 'Headline published!', 'Headline');
      await adminRow(page, NEWS_SPARE.title).getByRole('button', { name: 'Edit' }).click();
      await expect(field(page, 'Headline')).toHaveValue(NEWS_SPARE.title);
      await field(page, 'Headline').fill(NEWS_SPARE.edited);
      await submit(page, 'Update & Publish', 'Headline updated.', 'Headline');
      g.assertClean();
    });
  });

  test('qa2 sees time, sentiment, summary, tags and source; draft hidden', async ({ browser }, info) => {
    await as(browser, 'pro', async (page) => {
      const g = guard(page);
      await openPro(page, 'realtimenews');
      const row = page.locator('.rtn-row').filter({ hasText: NEWS.title });
      await expect(row).toHaveCount(1);
      await expect(row.locator('.rtn-title .t')).toHaveText(NEWS.title);
      await expect(row.locator('.rtn-time b')).toHaveText(/^\d{1,2}:\d{2}/);
      await expect(row.locator('.rtn-time span')).toHaveText(/just now|\dm ago/);
      await expect(row.locator('.rtn-sum')).toHaveText(NEWS.summary);
      const tags = row.locator('.rtn-tags .oc-tag');
      await expect(tags).toHaveText(['[TEST] Important', '[TEST] Regulation', NEWS.sentLabel, NEWS.source]);
      await expect(tags.filter({ hasText: NEWS.sentLabel })).toHaveClass(/green/);
      const spare = page.locator('.rtn-row').filter({ hasText: NEWS_SPARE.edited });
      await expect(spare.locator('.oc-tag').filter({ hasText: NEWS_SPARE.sentLabel })).toHaveClass(/red/);
      await expect(page.locator('.rtn-row .rtn-title .t').first()).toHaveText(NEWS_SPARE.edited); // newest first
      await expect(page.getByText(NEWS_DRAFT.title)).toHaveCount(0);
      await expectSaneText(page);
      await snap(page, info, 'admin-content-news-qa2');
      g.assertClean();
    });
  });

  test('qa3 deletes the spare → gone for qa2; qa1 sees the teaser', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      await openAdmin(page, '/admin/pro-news');
      await adminRow(page, NEWS_SPARE.edited).getByRole('button', { name: 'Delete' }).click();
      await expectMessage(page, 'Headline deleted.');
    });
    await as(browser, 'pro', async (page) => {
      await openPro(page, 'realtimenews');
      await expect(page.locator('.rtn-row').filter({ hasText: NEWS.title })).toHaveCount(1);
      await expect(page.getByText(NEWS_SPARE.edited)).toHaveCount(0);
    });
    await expectLockedForFree(browser, 'realtimenews');
  });
});

// ---------------------------------------------------------------------------
// 4 · Events & Announcements (+ live Q&A)
// ---------------------------------------------------------------------------

test.describe('Events & Announcements', () => {
  async function fill(page: Page, e: { title: string; date?: string; host?: string; status?: string; live?: boolean; video?: string }) {
    await field(page, 'Title').fill(e.title);
    await field(page, 'Date / time label').fill(e.date ?? '');
    await field(page, 'Host').fill(e.host ?? '');
    await field(page, 'Status').selectOption(e.status ?? 'upcoming');
    await field(page, 'YouTube video (id or URL)').fill(e.video ?? '');
    await page.getByLabel(/Live now/).setChecked(!!e.live);
  }

  test('qa3 publishes live, upcoming and past events, saves a draft, edits a spare', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      const g = guard(page);
      await openAdmin(page, '/admin/pro-events');
      for (const e of [EVENT_PAST, EVENT_UPCOMING, EVENT_LIVE, EVENT_SPARE]) {
        await fill(page, e);
        await submit(page, /^Publish$/, 'Event published!', 'Title');
      }
      await fill(page, EVENT_DRAFT);
      await submit(page, /^Save Draft$/, 'Draft saved.', 'Title');
      await expect(adminRow(page, EVENT_LIVE.title)).toContainText('LIVE');
      await adminRow(page, EVENT_SPARE.title).getByRole('button', { name: 'Edit' }).click();
      await expect(field(page, 'Title')).toHaveValue(EVENT_SPARE.title);
      await field(page, 'Title').fill(EVENT_SPARE.edited);
      await submit(page, 'Update & Publish', 'Event updated.', 'Title');
      g.assertClean();
    });
  });

  test('qa2: live event with embed + Q&A, upcoming and past sections, replay; draft hidden', async ({ browser }, info) => {
    await as(browser, 'pro', async (page) => {
      const g = guard(page);
      await openPro(page, 'events');
      const live = page.locator('.apanel').filter({ hasText: EVENT_LIVE.title });
      await expect(live).toHaveCount(1);
      await expect(live.getByText('Live now')).toBeVisible();
      await expect(live).toContainText(`${EVENT_LIVE.date} · ${EVENT_LIVE.host}`);
      await expect(live.locator('iframe')).toHaveAttribute('src', `https://www.youtube.com/embed/${VIDEO}`);

      // Ask a question, then upvote it once (a second click must not count again).
      const ask = live.getByPlaceholder('Submit a question…');
      await ask.fill(QUESTION);
      await ask.press('Enter');
      const q = live.locator('.chart-side-row').filter({ hasText: QUESTION });
      await expect(q).toHaveCount(1, { timeout: 20_000 });
      await expect(ask).toHaveValue('');
      const vote = q.locator('.followbtn');
      await expect(vote).toHaveText('1');
      await vote.click();
      await expect(vote).toHaveText('2');
      await expect(vote).toHaveClass(/\bon\b/);
      await vote.click();
      await page.waitForTimeout(1000);
      await expect(vote).toHaveText('2');

      // Upcoming (not live) and past sections.
      await expect(page.locator('.cal-day-h').filter({ hasText: 'Live & upcoming' })).toBeVisible();
      const upcoming = page.locator('.apanel').filter({ hasText: EVENT_UPCOMING.title });
      await expect(upcoming).toContainText(`${EVENT_UPCOMING.date} · ${EVENT_UPCOMING.host}`);
      await expect(upcoming.getByText('Live now')).toHaveCount(0);
      await expect(page.locator('.cal-day-h').filter({ hasText: 'Past events' })).toBeVisible();
      const past = page.locator('.apanel').filter({ hasText: EVENT_PAST.title });
      await expect(past).toContainText(`${EVENT_PAST.date} · ${EVENT_PAST.host}`);
      await past.getByRole('button', { name: /Watch replay/ }).click();
      await expect(past.locator('iframe')).toHaveAttribute('src', `https://www.youtube.com/embed/${VIDEO}`);
      await expect(past.getByRole('button', { name: /Hide/ })).toBeVisible();

      await expect(page.getByText(EVENT_DRAFT.title)).toHaveCount(0);
      await expect(page.getByText(EVENT_SPARE.edited)).toHaveCount(1);
      await expectSaneText(page);
      await snap(page, info, 'admin-content-events-qa2');
      g.assertClean();
    });
  });

  test('a new qa2 session sees the shared question with its 2 votes', async ({ browser }) => {
    await as(browser, 'pro', async (page) => {
      await openPro(page, 'events');
      const q = page.locator('.apanel').filter({ hasText: EVENT_LIVE.title }).locator('.chart-side-row').filter({ hasText: QUESTION });
      await expect(q.locator('.followbtn')).toHaveText('2');
    });
  });

  test('qa3 deletes the spare → gone for qa2; qa1 sees the teaser', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      await openAdmin(page, '/admin/pro-events');
      await adminRow(page, EVENT_SPARE.edited).getByRole('button', { name: 'Delete' }).click();
      await expectMessage(page, 'Event deleted.');
    });
    await as(browser, 'pro', async (page) => {
      await openPro(page, 'events');
      await expect(page.getByText(EVENT_LIVE.title)).toBeVisible();
      await expect(page.getByText(EVENT_SPARE.edited)).toHaveCount(0);
    });
    await expectLockedForFree(browser, 'events');
  });
});

// ---------------------------------------------------------------------------
// 5 · Calendar (team events — Plus page, so qa1 sees them too)
// ---------------------------------------------------------------------------

test.describe('Calendar — team events', () => {
  type Cal = typeof CAL_HIGH;
  async function fill(page: Page, c: Cal) {
    await field(page, 'Title').fill(c.t);
    await field(page, 'Date').fill(c.date);
    await field(page, 'Time in UTC (optional — blank = all day)').fill(c.time);
    await field(page, 'Impact').selectOption(c.imp);
    await field(page, 'Category').selectOption(c.cat);
    await field(page, 'Affected assets (optional)').fill(c.assets);
    await field(page, 'Description').fill(c.d);
  }

  async function calendarChip(page: Page, c: Cal) {
    await openPage(page, '/world/calendar');
    if (new Date(c.date).getUTCMonth() !== new Date().getMonth()) await page.getByRole('button', { name: 'Next month' }).click();
    return page.locator('.w-cal-cell-event').filter({ hasText: c.t });
  }

  test('qa3 publishes two team events and saves a draft', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      const g = guard(page);
      await openPage(page, '/admin/pro-calendar', { ready: 'text=Scheduled events' });
      await fill(page, CAL_HIGH);
      await submit(page, /^Publish$/, 'Event published!', 'Title');
      await fill(page, CAL_MED);
      await submit(page, /^Publish$/, 'Event published!', 'Title');
      await fill(page, CAL_DRAFT);
      await submit(page, /^Save Draft$/, 'Draft saved.', 'Title');
      // The CoinGlass feed switches exist and stay as they are (the calendar spec flips them).
      await expect(page.getByRole('switch', { name: 'Macro events (CoinGlass)' })).toBeVisible();
      g.assertClean();
    });
  });

  for (const role of ['pro', 'plus'] as const) {
    test(`${role === 'pro' ? 'qa2' : 'qa1'} sees both on the Calendar (★ Kumami event, impact, details), not the draft`, async ({ browser }, info) => {
      await as(browser, role, async (page) => {
        const high = await calendarChip(page, CAL_HIGH);
        await expect(high).toHaveCount(1);
        await expect(high).toContainText('★');
        await expect(high).toHaveAttribute('title', /Project · Kumami, HIGH/);
        const med = await calendarChip(page, CAL_MED);
        await expect(med).toHaveCount(1);
        await expect(med).toContainText('★');
        await expect(med).toHaveAttribute('title', /On-chain · Kumami, MED/);
        expect(await (await calendarChip(page, CAL_DRAFT)).count()).toBe(0);
        await high.click();
        await expect(page.getByText(CAL_HIGH.d).first()).toBeVisible();
        await snap(page, info, `admin-content-calendar-${role === 'pro' ? 'qa2' : 'qa1'}`);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// 6 · Alpha Room
// ---------------------------------------------------------------------------

test.describe('Alpha Room', () => {
  test('qa3 posts an alpha message', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      const g = guard(page);
      await openPage(page, '/admin/alpha-room', { ready: 'input[placeholder="Message #alpha"]' });
      await page.getByPlaceholder('Message #alpha').fill(ALPHA);
      await page.getByPlaceholder('Message #alpha').press('Enter');
      await expect(page.getByText(ALPHA)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByPlaceholder('Message #alpha')).toHaveValue('');
      g.assertClean();
    });
  });

  test('qa2 sees it at the top of the Alpha Room as "Kumami World"; qa1 sees the teaser', async ({ browser }, info) => {
    await as(browser, 'pro', async (page) => {
      const g = guard(page);
      await openPro(page, 'alpha');
      const msg = page.locator('div').filter({ has: page.getByText(ALPHA, { exact: true }) }).last();
      await expect(page.getByText(ALPHA, { exact: true })).toBeVisible();
      await expect(msg).toContainText('Kumami World');
      await snap(page, info, 'admin-content-alpha-qa2');
      g.assertClean();
    });
    await expectLockedForFree(browser, 'alpha');
  });
});

// ---------------------------------------------------------------------------
// 7 · Market Analysis
// ---------------------------------------------------------------------------

test.describe('Market Analysis', () => {
  test('qa3 publishes an analysis with a chart image', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      const g = guard(page);
      const alerts: string[] = [];
      page.on('dialog', (d) => { alerts.push(d.message()); d.accept(); });
      await openPage(page, '/admin/market-analysis', { ready: 'form' });
      await field(page, 'Title').fill(ANALYSIS.title);
      await field(page, 'Content').fill(ANALYSIS.content);
      await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE.fixture);
      await expect(page.getByAltText('Preview')).toBeVisible();
      await page.getByRole('button', { name: 'Publish Market Analysis' }).click();
      await expect.poll(() => alerts, { timeout: 30_000 }).toContain('Market analysis published successfully!');
      g.assertClean();
    });
  });

  test('qa2 sees it as today\'s focus with the image; qa1 sees the teaser', async ({ browser }, info) => {
    await as(browser, 'pro', async (page) => {
      const g = guard(page);
      await openPro(page, 'market');
      await expect(page.getByRole('heading', { name: ANALYSIS.title })).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('.kp-prose')).toHaveText(ANALYSIS.content);
      const img = page.getByAltText(ANALYSIS.title).first();
      await expect(img).toHaveAttribute('src', /marketAnalysisImages%2Fqa-test-chart\.png/);
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
      await expect(page.getByText(/^01\/\d{2}$/)).toBeVisible(); // newest first
      await expectSaneText(page);
      await snap(page, info, 'admin-content-market-analysis-qa2');
      g.assertClean();
    });
    await expectLockedForFree(browser, 'market');
  });
});

// ---------------------------------------------------------------------------
// 8 · Daily Pro Digest rolls everything up
// ---------------------------------------------------------------------------

test.describe('Daily Pro Digest', () => {
  test('qa2 sees the latest [TEST] items in every section; qa1 sees the teaser', async ({ browser }, info) => {
    await as(browser, 'pro', async (page) => {
      const g = guard(page);
      await openPro(page, 'digest');
      const section = (title: string) => page.locator('.dig-section').filter({ has: page.getByRole('heading', { name: title }) });
      await expect(section('Alpha Room')).toContainText(ALPHA);
      await expect(section('Real-Time News')).toContainText(NEWS.title);
      await expect(section('Kumami Research')).toContainText(`${RESEARCH.name} — long ${RESEARCH.asset}`);
      await expect(section('Airdrops & Whitelist')).toContainText(AIRDROP.name);
      await expect(section('Calendar')).toContainText(CAL_HIGH.t);
      await expect(page.getByText(RESEARCH_DRAFT.name)).toHaveCount(0);
      await expect(page.getByText(NEWS_DRAFT.title)).toHaveCount(0);
      await expect(page.getByText(AIRDROP_DRAFT.name)).toHaveCount(0);
      await expect(page.getByText(CAL_DRAFT.t)).toHaveCount(0);
      await expectSaneText(page);
      await snap(page, info, 'admin-content-digest-qa2');
      // Each section's link opens its tab (Calendar → the shared Calendar page).
      await section('Calendar').getByRole('link').click();
      await expect(page).toHaveURL(/\/world\/calendar/, { timeout: 30_000 });
      g.assertClean();
    });
    await expectLockedForFree(browser, 'digest');
  });
});
