/**
 * QA — Plus vs Pro access layer: nothing Pro may leak to non-subscribers.
 * Part of the standard regression (Andrew, 10 Oct 2026). Personas:
 *   qa1 = fixed free user · qa2 = fixed Pro (granted by qa3 on /admin/subscriptions) · qa3 = fixed superadmin, NOT subscribed
 *   qa0 = brand-new account every run — the Firestore-rules probes and the Subscriptions
 *         grant/expiry/remove tests use it, so the fixed accounts are never changed.
 * Rule (spec v1.6): Pro = subscribed (isPremium) ONLY — admin roles don't unlock Pro;
 * Plus pages are always the cut-down Plus version, even for Pro accounts.
 *
 * Layers checked: (1) UI per persona, (2) direct API calls with each persona's
 * real ID token, (3) Firestore security rules via the REST API (same rules the
 * browser SDK hits). Layer-3 holes that need a rules deploy are marked
 * `test.fail()` with a KNOWN-HOLE note: they pass while the hole exists and turn
 * red the moment it's fixed (then remove the fail marker).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';
import { AUTH, apiAsUser, guard, openPage, type Role } from '../helpers';
import { Timestamp } from 'firebase-admin/firestore';
import { admin, readPersonas } from '../personas';
import { deleteQaDocs } from '../admin-data';

const PRO_TABS = [
  'digest', 'followhub', 'flowradar', 'watchlist', 'spotpulse', 'realtimenews', 'alpha', 'research',
  'market', 'scanner', 'marketcap', 'airdrops', 'portfolio', 'addresstracker', 'kumaai', 'events',
];
const PLUS_ROSTER = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];

async function as(browser: Browser, role: Role, fn: (page: Page) => Promise<void>) {
  const ctx = await browser.newContext({ storageState: AUTH[role] });
  const page = await ctx.newPage();
  try { await fn(page); } finally { await ctx.close(); }
}

/** Token + project for Firestore REST calls made as the signed-in user. */
async function firestore(page: Page, method: string, docPath: string, body?: unknown) {
  return page.evaluate(async ({ method, docPath, body }) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('firebaseLocalStorageDb'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const rows: { value?: { stsTokenManager?: { accessToken?: string } } }[] = await new Promise((res) => {
      const q = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').getAll();
      q.onsuccess = () => res(q.result); q.onerror = () => res([]);
    });
    const token = rows.map((r) => r.value?.stsTokenManager?.accessToken).find(Boolean);
    const url = `https://firestore.googleapis.com/v1/projects/kumami-dev/databases/(default)/documents/${docPath}`;
    const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status };
  }, { method, docPath, body });
}

// ---------------------------------------------------------------------------
// 1 · UI
// ---------------------------------------------------------------------------

for (const role of ['plus', 'admin'] as const) {
  test.describe(`UI — ${role === 'plus' ? 'qa1 free' : 'qa3 admin (not subscribed)'}: every Pro tab is locked`, () => {
    test.use({ storageState: AUTH[role] });
    for (const tab of PRO_TABS) {
      test(`/world/pro?tab=${tab} → teaser, no Pro data requested`, async ({ page }) => {
        const proCalls: string[] = [];
        page.on('request', (r) => { if (/[?&]view=pro\b/.test(r.url()) || r.url().includes('/api/wallet-profile')) proCalls.push(r.url()); });
        const g = guard(page);
        await openPage(page, `/world/pro?tab=${tab}`);
        await expect(page.locator('.w-pro-teaser')).toBeVisible();
        for (const marker of ['Flow Radar Pro', 'Watchlist Pro', 'Spot Pulse Pro', 'Daily Pro Digest', 'Also Worth Watching']) {
          await expect(page.getByRole('heading', { name: marker })).toHaveCount(0);
        }
        expect(proCalls, 'non-subscriber triggered Pro API calls').toEqual([]);
        g.assertClean();
      });
    }
  });
}

test.describe('UI — qa2 Pro: every Pro tab opens (no teaser)', () => {
  test.use({ storageState: AUTH.pro });
  const MARKER: Record<string, RegExp> = { flowradar: /Flow Radar Pro/, watchlist: /Watchlist Pro/, spotpulse: /Spot Pulse Pro/, digest: /Daily Pro Digest/ };
  for (const tab of PRO_TABS) {
    test(`/world/pro?tab=${tab} → real content`, async ({ page }) => {
      const g = guard(page);
      await openPage(page, `/world/pro?tab=${tab}`);
      await expect(page.locator('.w-pro-teaser')).toHaveCount(0);
      if (MARKER[tab]) await expect(page.getByText(MARKER[tab]).first()).toBeVisible();
      g.assertClean();
    });
  }
});

for (const role of ['plus', 'pro', 'admin'] as const) {
  test.describe(`UI — Plus pages are the Plus version for ${role === 'plus' ? 'qa1' : role === 'pro' ? 'qa2 (Pro)' : 'qa3'}`, () => {
    test.use({ storageState: AUTH[role] });
    test('Flow Radar Plus: delayed, 5 coins, no Pro extras', async ({ page }) => {
      await openPage(page, '/world/flow-radar');
      await expect(page.getByRole('heading', { name: /Flow Radar Plus/ })).toBeVisible();
      await expect(page.getByText(/Delayed 15m/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'LOW', exact: true })).toHaveCount(0);
      await expect(page.getByText(/Flow balance/i)).toHaveCount(0);
    });
    test('Watchlist Plus: 5 anchors only, no adding, no extra coins', async ({ page }) => {
      await openPage(page, '/world/watchlist');
      await expect(page.getByRole('heading', { name: /Watchlist Plus/ })).toBeVisible();
      await expect(page.getByText('Also Worth Watching')).toHaveCount(0);
      await expect(page.getByPlaceholder(/ticker|symbol|add/i)).toHaveCount(0);
      const rows = page.locator('[data-tour="wl-table"] .w-wl-trow');
      await expect(rows).toHaveCount(5);
    });
    test('Spot Pulse tile (On-Chain): 5 tiles + unlock link, no Pro title', async ({ page }) => {
      await openPage(page, '/world/onchain');
      await expect(page.getByText('Unlock Spot Pulse Pro →').first()).toBeVisible();
      await expect(page.getByText('Spot Pulse Pro', { exact: true })).toHaveCount(0);
    });
  });
}

test.describe('UI — /admin is role-gated', () => {
  test('qa1 and qa2 are bounced out of /admin; qa3 gets in', async ({ browser }) => {
    for (const role of ['plus', 'pro'] as const) {
      await as(browser, role, async (page) => {
        await page.goto('/admin/pro-research');
        await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toMatch(/^\/admin/);
      });
    }
    await as(browser, 'admin', async (page) => {
      await openPage(page, '/admin/pro-research', { ready: 'form' });
    });
  });
});

// ---------------------------------------------------------------------------
// 2 · API (direct calls with each persona's ID token)
// ---------------------------------------------------------------------------

test.describe('API — Pro data only for subscribers', () => {
  for (const role of ['plus', 'admin', 'pro'] as const) {
    const isPro = role === 'pro';
    test(`${role}: flow-radar / watchlist / spot-pulse with ?view=pro`, async ({ browser }) => {
      await as(browser, role, async (page) => {
        await openPage(page, '/world/console');
        type FR = { delayed: boolean; events: { asset: string; severity: string; crossSignal?: unknown }[] };
        const fr = await apiAsUser<FR>(page, '/api/market/flow-radar?view=pro');
        expect(fr.status).toBe(200);
        if (isPro) {
          expect(fr.body.delayed).toBe(false);
        } else {
          expect(fr.body.delayed, 'non-subscriber got the real-time feed').toBe(true);
          for (const e of fr.body.events) {
            expect(PLUS_ROSTER, `non-roster coin ${e.asset} leaked`).toContain(e.asset);
            expect(e.severity).not.toBe('LOW');
            expect(e.crossSignal).toBeUndefined();
          }
        }

        type WL = { pinCap: number | null; sectionC: unknown[]; curatedAssets: unknown[]; sectionCMode?: string };
        const wl = await apiAsUser<WL>(page, '/api/market/watchlist?view=pro');
        expect(wl.status).toBe(200);
        if (isPro) {
          expect(wl.body.pinCap).toBe(15);
          expect(wl.body.sectionCMode).toBeDefined();
        } else {
          expect(wl.body.pinCap).toBeNull();
          expect(wl.body.sectionC).toHaveLength(0);
          expect(wl.body.curatedAssets).toHaveLength(0);
        }

        type SP = { tiles: { asset: string }[]; extraMode?: string };
        const sp = await apiAsUser<SP>(page, '/api/market/spot-pulse?view=pro');
        expect(sp.status).toBe(200);
        if (isPro) expect(sp.body.extraMode).toBeDefined();
        else {
          expect(sp.body.extraMode).toBeUndefined();
          for (const t of sp.body.tiles) expect(PLUS_ROSTER).toContain(t.asset);
        }
      });
    });

    test(`${role}: pinning a coin and the wallet lookup`, async ({ browser }) => {
      await as(browser, role, async (page) => {
        await openPage(page, '/world/console');
        const call = (method: string, url: string, body?: unknown) =>
          page.evaluate(async ({ method, url, body }) => {
            const db = await new Promise<IDBDatabase>((res) => { const r = indexedDB.open('firebaseLocalStorageDb'); r.onsuccess = () => res(r.result); });
            const rows: { value?: { stsTokenManager?: { accessToken?: string } } }[] = await new Promise((res) => {
              const q = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').getAll(); q.onsuccess = () => res(q.result);
            });
            const token = rows.map((r) => r.value?.stsTokenManager?.accessToken).find(Boolean);
            const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
            return res.status;
          }, { method, url, body });
        const add = await call('POST', '/api/market/watchlist?view=pro', { symbol: 'DOGE' });
        if (isPro) {
          expect(add).toBe(200);
          expect(await call('DELETE', '/api/market/watchlist?view=pro', { symbol: 'DOGE' })).toBe(200);
        } else {
          expect(add, 'non-subscriber could pin a coin').toBe(403);
        }
        const wallet = await call('GET', '/api/wallet-profile?address=0x0000000000000000000000000000000000000000');
        if (isPro) expect(wallet).not.toBe(403);
        else expect(wallet, 'non-subscriber reached the Pro wallet lookup').toBe(403);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// 3 · QA3 authors Pro content → QA2 sees it, QA1 doesn't
// ---------------------------------------------------------------------------

test.describe('Cross-check — QA3 publishes Pro research', () => {
  test.describe.configure({ mode: 'serial' });
  const title = `[TEST] Access check ${Date.now().toString(36)}`;
  test.afterAll(async () => { await deleteQaDocs('pro_research', 'name', ['[TEST] Access check']); });

  test('qa3 publishes; qa2 sees it on Kumami Research; qa1 gets the teaser', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      await openPage(page, '/admin/pro-research', { ready: 'form' });
      const form = page.locator('form').first();
      await form.locator('input').nth(0).fill(title);
      await form.locator('input').nth(1).fill('[TEST] QA analyst');
      await form.locator('input').nth(2).fill('BTC');
      await form.locator('textarea').nth(0).fill('[TEST] Temporary access-check call — deleted automatically.');
      await page.getByRole('button', { name: /^Publish$/ }).click();
      await expect(page.getByText('Research call published!')).toBeVisible();
    });
    await as(browser, 'pro', async (page) => {
      await openPage(page, '/world/pro?tab=research');
      await expect(page.getByText(title)).toBeVisible({ timeout: 30_000 });
    });
    await as(browser, 'plus', async (page) => {
      await openPage(page, '/world/pro?tab=research');
      await expect(page.locator('.w-pro-teaser')).toBeVisible();
      await expect(page.getByText(title)).toHaveCount(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 4 · Firestore rules (REST = same rules the browser SDK hits)
// ---------------------------------------------------------------------------

test.describe('Firestore rules — a free user must not grant themselves Pro', () => {
  test.describe.configure({ mode: 'serial' });
  let qa0Uid = '';
  test.beforeAll(() => { qa0Uid = readPersonas().qa0.uid!; });
  test.afterAll(async () => {
    // Undo anything a hole let through, so later specs see a clean free user.
    await admin().db.collection('users').doc(qa0Uid).set({ isPremium: false, role: 'user' }, { merge: true });
    const subs = await admin().db.collection('subscriptions').where('userId', '==', qa0Uid).get();
    await Promise.all(subs.docs.map((d) => d.ref.delete()));
  });

  test('qa0 cannot set isPremium=true on their own user doc', async ({ browser }) => {
    test.fail(true, 'KNOWN HOLE: users/{uid} allows the owner to update ANY field — fix needs a rules deploy (awaiting Andrew).');
    await as(browser, 'fresh', async (page) => {
      await openPage(page, '/world/console');
      const r = await firestore(page, 'PATCH', `users/${qa0Uid}?updateMask.fieldPaths=isPremium`, { fields: { isPremium: { booleanValue: true } } });
      expect(r.status, 'self-upgrade to Pro was allowed').toBe(403);
    });
  });

  test('qa0 cannot make themselves superadmin', async ({ browser }) => {
    test.fail(true, 'KNOWN HOLE: same rule — owner can write their own role.');
    await as(browser, 'fresh', async (page) => {
      await openPage(page, '/world/console');
      const r = await firestore(page, 'PATCH', `users/${qa0Uid}?updateMask.fieldPaths=role`, { fields: { role: { stringValue: 'superadmin' } } });
      expect(r.status, 'self-promotion to superadmin was allowed').toBe(403);
    });
  });

  test('qa0 cannot create an active subscription for themselves', async ({ browser }) => {
    test.fail(true, 'KNOWN HOLE: subscriptions allow create by the owner with any status.');
    await as(browser, 'fresh', async (page) => {
      await openPage(page, '/world/console');
      const r = await firestore(page, 'POST', 'subscriptions', { fields: { userId: { stringValue: qa0Uid }, status: { stringValue: 'active' }, planId: { stringValue: 'pro' } } });
      expect(r.status, 'self-created active subscription was allowed').toBe(403);
    });
  });

  test('qa0 cannot read Pro dashboard content directly', async ({ browser }) => {
    test.fail(true, 'KNOWN HOLE: pro_* collections are publicly readable (allow read: if true for pro_*).');
    await as(browser, 'fresh', async (page) => {
      await openPage(page, '/world/console');
      const r = await firestore(page, 'GET', 'pro_research');
      expect(r.status, 'non-subscriber read pro_research directly').toBe(403);
    });
  });
});

// ---------------------------------------------------------------------------
// 5 · Subscriptions admin tool (superadmin only, durations, expiry)
// ---------------------------------------------------------------------------

test.describe('Subscriptions admin tool — grant, expiry, remove', () => {
  test.describe.configure({ mode: 'serial' });
  let qa0: { uid: string; email: string };
  test.beforeAll(() => { const p = readPersonas().qa0; qa0 = { uid: p.uid!, email: p.email }; });
  test.afterAll(async () => {
    await admin().db.collection('users').doc(qa0.uid).set({ isPremium: false, proUntil: null, subscriptionStatus: 'cancelled-immediate' }, { merge: true });
  });

  test('only superadmins can call the grant API', async ({ browser }) => {
    for (const role of ['fresh', 'plus', 'pro'] as const) {
      await as(browser, role, async (page) => {
        await openPage(page, '/world/console');
        const status = await page.evaluate(async (uid) => {
          const db = await new Promise<IDBDatabase>((res) => { const r = indexedDB.open('firebaseLocalStorageDb'); r.onsuccess = () => res(r.result); });
          const rows: { value?: { stsTokenManager?: { accessToken?: string } } }[] = await new Promise((res) => {
            const q = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').getAll(); q.onsuccess = () => res(q.result);
          });
          const token = rows.map((r) => r.value?.stsTokenManager?.accessToken).find(Boolean);
          const res = await fetch('/api/admin/subscription', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, action: 'grant', months: 1 }) });
          return res.status;
        }, qa0.uid);
        expect(status, `${role} could grant Pro`).toBe(403);
      });
    }
  });

  test('qa3 grants qa0 Pro for 1 month → qa0 gets Pro', async ({ browser }) => {
    await as(browser, 'admin', async (page) => {
      page.on('dialog', (d) => d.accept());
      await openPage(page, '/admin/subscriptions', { ready: 'text=Subscriptions' });
      await page.getByPlaceholder('Search by email or name').fill(qa0.email);
      const row = page.locator(`tr[data-user-email="${qa0.email}"]`);
      await row.getByLabel(`Duration for ${qa0.email}`).selectOption('1');
      await row.getByRole('button', { name: 'Grant Pro' }).click();
      await expect(row.getByRole('button', { name: 'Remove Pro' })).toBeVisible({ timeout: 30_000 });
      await expect(row).toContainText('Pro');
    });
    const d = (await admin().db.collection('users').doc(qa0.uid).get()).data()!;
    expect(d.isPremium).toBe(true);
    expect(d.proUntil?.toMillis() - Date.now()).toBeGreaterThan(27 * 86_400_000);
    await as(browser, 'fresh', async (page) => {
      await openPage(page, '/world/pro?tab=flowradar');
      await expect(page.locator('.w-pro-teaser')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: /Flow Radar Pro/ })).toBeVisible();
    });
  });

  test('an expired grant locks qa0 out again (UI + API)', async ({ browser }) => {
    await admin().db.collection('users').doc(qa0.uid).set({ proUntil: Timestamp.fromMillis(Date.now() - 60_000) }, { merge: true });
    await as(browser, 'fresh', async (page) => {
      await openPage(page, '/world/pro?tab=flowradar');
      await expect(page.locator('.w-pro-teaser')).toBeVisible();
      const fr = await apiAsUser<{ delayed: boolean }>(page, '/api/market/flow-radar?view=pro');
      expect(fr.body.delayed, 'expired grant still got the real-time feed').toBe(true);
    });
  });

  test('qa3 removes Pro → status Free', async ({ browser }) => {
    await admin().db.collection('users').doc(qa0.uid).set({ proUntil: null }, { merge: true }); // active again, to remove it
    await as(browser, 'admin', async (page) => {
      page.on('dialog', (d) => d.accept());
      await openPage(page, '/admin/subscriptions', { ready: 'text=Subscriptions' });
      await page.getByPlaceholder('Search by email or name').fill(qa0.email);
      const row = page.locator(`tr[data-user-email="${qa0.email}"]`);
      await row.getByRole('button', { name: 'Remove Pro' }).click();
      await expect(row.getByRole('button', { name: 'Grant Pro' })).toBeVisible({ timeout: 30_000 });
      await expect(row).toContainText('Free');
    });
    const audit = await admin().db.collection('admin_audit').where('targetUid', '==', qa0.uid).get();
    expect(audit.size, 'grant + remove should be audited').toBeGreaterThanOrEqual(2);
  });
});
