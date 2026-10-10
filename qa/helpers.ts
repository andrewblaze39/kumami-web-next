/**
 * Shared QA helpers (kumami-qa skill).
 *
 *   const g = guard(page);          // start recording problems on this page
 *   await openPage(page, '/world/calendar');
 *   await expectSaneText(page);     // no NaN / undefined / $0 placeholders…
 *   g.assertClean();                // no console errors, page errors, failed API calls
 */
import { expect, type Page, type TestInfo } from '@playwright/test';

/** plus = qa1 (new free user) · pro = qa2 (granted Pro by qa3) · admin = qa3 (superadmin, not subscribed). See personas.ts. */
export type Role = 'plus' | 'pro' | 'admin';

export const AUTH: Record<Role, string> = {
  plus: 'qa/.auth/qa1.json',
  pro: 'qa/.auth/qa2.json',
  admin: 'qa/.auth/qa3.json',
};

/** Console noise that is not a product bug (dev-server / third-party chatter). */
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[HMR\]|\[Fast Refresh\]/i,
  /favicon\.ico/i,
  /analytics|googletagmanager|gtag/i,
  /Failed to load resource.*(fonts|_next\/static)/i,
];

export type Issue = { kind: 'console' | 'pageerror' | 'api' | 'requestfailed'; detail: string };

/** Start recording problems on a page. Call before navigating. */
export function guard(page: Page) {
  const issues: Issue[] = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (!IGNORED_CONSOLE.some((r) => r.test(t))) issues.push({ kind: 'console', detail: t.slice(0, 300) });
  });
  page.on('pageerror', (e) => issues.push({ kind: 'pageerror', detail: String(e.message).slice(0, 300) }));
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('/api/') && r.status() >= 400) issues.push({ kind: 'api', detail: `${r.status()} ${u}` });
  });
  page.on('requestfailed', (r) => {
    const u = r.url();
    const err = r.failure()?.errorText ?? '';
    // ERR_ABORTED = the app cancelled its own request (e.g. switching timeframe) — not a failure.
    if (u.includes('/api/') && !/ERR_ABORTED|NS_BINDING_ABORTED/.test(err)) issues.push({ kind: 'requestfailed', detail: `${err} ${u}` });
  });
  return {
    issues,
    assertClean(allow: RegExp[] = []) {
      const real = issues.filter((i) => !allow.some((r) => r.test(i.detail)));
      expect(real, `page problems:\n${real.map((i) => `${i.kind}: ${i.detail}`).join('\n')}`).toEqual([]);
    },
  };
}

/**
 * Navigate and wait until the page is REALLY ready:
 *  1. the app shell is rendered (not the auth splash) — `ready` selector,
 *     default the World sidebar; admin pages pass their own;
 *  2. we weren't bounced to the gate / sign-up (session missing or expired);
 *  3. skeleton loaders are gone (data rendered or an empty/error state shown).
 * A bare "no skeletons" check passes on the splash screen — never rely on it alone.
 */
export async function openPage(page: Page, path: string, opts: { ready?: string } = {}) {
  await page.goto(path);
  const ready = opts.ready ?? '#w-sidebar';
  await expect(page.locator(ready).first(), `"${ready}" never appeared on ${path} — still on the splash/gate?`)
    .toBeVisible({ timeout: 60_000 });
  const want = path.split('?')[0];
  const got = new URL(page.url()).pathname;
  expect(got, `navigated to ${path} but ended on ${got} (signed out / redirected?)`).toBe(want);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 45_000 });
  await dismissOverlays(page);
}

/**
 * Close first-visit product tours ("Welcome to your dashboard" → Skip) and the
 * high-impact event popups (Dismiss), which legitimately cover the page for a
 * fresh account and block clicks. Specs that TEST those overlays should assert
 * on them before calling openPage again (or use page.goto directly).
 */
export async function dismissOverlays(page: Page) {
  // First-visit tours auto-open ~700ms after load — give them time to appear.
  await page.waitForTimeout(1200);
  for (let i = 0; i < 3; i++) {
    const skip = page.getByRole('button', { name: /^skip$/i });
    const dismiss = page.getByRole('dialog').getByRole('button', { name: /^dismiss$/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    else if (await dismiss.first().isVisible().catch(() => false)) await dismiss.first().click();
    else return;
    await page.waitForTimeout(300); // let the overlay animate out before re-checking
  }
}

/** Placeholder / broken-value patterns that must never reach users. */
const BAD_TEXT: [RegExp, string][] = [
  [/\bNaN\b/, 'NaN'],
  [/\bundefined\b/, 'undefined'],
  [/\bnull\b(?![-\w])/, 'null'],
  [/\[object Object\]/, '[object Object]'],
  [/\bInfinity\b/, 'Infinity'],
  [/\$0(?:\.0+)?(?![.\d])/, '$0 placeholder'],
  [/(?<![\d.])(?:[1-9]\d{3,}|[2-9]\d{2})(?:\.\d+)?%/, 'percentage ≥ 200%'],
  [/coinglass/i, 'provider name shown to users'],
  [/lorem ipsum/i, 'lorem ipsum'],
];

/** Fail on placeholder/broken values in the visible page text. `allow` skips known-OK matches. */
export async function expectSaneText(page: Page, allow: RegExp[] = []) {
  const text = await page.locator('main, .w-main, body').first().innerText();
  const hits: string[] = [];
  for (const [re, label] of BAD_TEXT) {
    const m = text.match(re);
    if (m && !allow.some((a) => a.test(m[0]))) {
      const i = text.indexOf(m[0]);
      hits.push(`${label}: …${text.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, ' ')}…`);
    }
  }
  expect(hits, `suspicious text:\n${hits.join('\n')}`).toEqual([]);
}

/** Full-page screenshot attached to the report and saved under qa/artifacts/screens. */
export async function snap(page: Page, testInfo: TestInfo, name: string) {
  const file = `qa/artifacts/screens/${testInfo.project.name}-${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
}

/** Call an internal API as the signed-in user (reuses the page's Firebase ID token). */
export async function apiAsUser<T = unknown>(page: Page, path: string): Promise<{ status: number; body: T }> {
  return page.evaluate(async (p) => {
    // Firebase stores the signed-in user in IndexedDB; the app exposes no global,
    // so read the token the same way the app's fetch helper does.
    const dbReq = indexedDB.open('firebaseLocalStorageDb');
    const token: string | null = await new Promise((resolve) => {
      dbReq.onsuccess = () => {
        const tx = dbReq.result.transaction('firebaseLocalStorage', 'readonly');
        const all = tx.objectStore('firebaseLocalStorage').getAll();
        all.onsuccess = () => {
          const u = (all.result as { value?: { stsTokenManager?: { accessToken?: string } } }[])
            .map((r) => r.value?.stsTokenManager?.accessToken).find(Boolean);
          resolve(u ?? null);
        };
        all.onerror = () => resolve(null);
      };
      dbReq.onerror = () => resolve(null);
    });
    const res = await fetch(p, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  }, path) as Promise<{ status: number; body: T }>;
}
