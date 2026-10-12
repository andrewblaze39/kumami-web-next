/**
 * QA — Payments & Referrals (spec v1.13 Pro §21–23, plan docs/plans/2026-10-11-payments-referral-api.md).
 *
 * Personas: qa0 = fresh account (the payer — every state change happens on it),
 * qa4 = throw-away "referrer" created here with the Admin SDK (qa4-<run>@kumami.test,
 * removed by the next run's cleanup), qa1/qa2 untouched except read-only checks.
 *
 * Crypto is tested end to end through the real webhook route with IPNs signed by
 * NOWPAYMENTS_IPN_SECRET (the same HMAC NOWPayments sends). Orders are seeded with the
 * Admin SDK when NOWPAYMENTS_API_KEY is not set (no sandbox invoice to create).
 * The Stripe browser flow needs STRIPE_* test keys — those tests skip until they exist;
 * the Stripe webhook logic itself is covered by unit tests (src/lib/billing/__tests__).
 */
import { createHmac } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';
import { AUTH, guard, openPage, snap, expectSaneText } from '../helpers';
import { admin, idTokenFor, readPersonas, QA_DOMAIN } from '../personas';

test.describe.configure({ mode: 'serial' });

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const DAY = 86_400_000;
const hasStripe = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_MONTHLY;

let qa0Uid = '';
let qa4Uid = '';
let qa0Token = '';
let qa4Token = '';
let qa0Code = '';
let qa4Code = '';
const orders: string[] = [];
let paymentSeq = Date.now() % 1_000_000_000;

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortDeep((v as Record<string, unknown>)[k])]));
  }
  return v;
}

async function sendIpn(request: APIRequestContext, body: Record<string, unknown>, sig?: string | null) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET!;
  const signature = sig === undefined ? createHmac('sha512', secret).update(JSON.stringify(sortDeep(body))).digest('hex') : sig;
  return request.post('/api/v1/webhooks/nowpayments', {
    data: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(signature ? { 'x-nowpayments-sig': signature } : {}) },
  });
}

async function seedCryptoOrder(uid: string, plan: 'monthly' | 'yearly', referralCode: string | null) {
  const { db } = admin();
  const ref = db.collection('checkout_orders').doc();
  await ref.set({
    userId: uid, provider: 'crypto', plan, amountCents: plan === 'monthly' ? 1999 : 19999, currency: 'usd',
    referralCode, status: 'pending', providerRef: null, createdAt: Timestamp.now(), qa: true,
  });
  orders.push(ref.id);
  return ref.id;
}

const ipnBody = (orderId: string, plan: 'monthly' | 'yearly', status = 'finished', paymentId = ++paymentSeq) => ({
  payment_id: paymentId, invoice_id: 4242, order_id: orderId, payment_status: status,
  price_amount: plan === 'monthly' ? 19.99 : 199.99, price_currency: 'usd',
  pay_amount: 200.12, actually_paid: 200.12, pay_currency: 'usdttrc20', outcome_amount: 199.5, outcome_currency: 'usdc',
});

async function user(uid: string) {
  return (await admin().db.collection('users').doc(uid).get()).data() ?? {};
}

async function ledgerSum(uid: string) {
  const q = await admin().db.collection('referral_ledger').where('userId', '==', uid).get();
  return q.docs.reduce((a, d) => a + Number(d.get('amountCents')), 0);
}

async function api(request: APIRequestContext, path: string, token: string | null, init: { method?: 'GET' | 'POST'; body?: unknown } = {}) {
  const res = await request.fetch(`/api/v1${path}`, {
    method: init.method ?? 'GET',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    data: init.body ? JSON.stringify(init.body) : undefined,
  });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

/** Firestore REST as the signed-in page user (same rules the browser SDK hits). */
async function firestoreAs(page: Page, method: string, docPath: string, body?: unknown) {
  return page.evaluate(async ({ method, docPath, body }) => {
    const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('firebaseLocalStorageDb'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const rows: { value?: { stsTokenManager?: { accessToken?: string } } }[] = await new Promise((res) => {
      const q = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').getAll();
      q.onsuccess = () => res(q.result); q.onerror = () => res([]);
    });
    const token = rows.map((r) => r.value?.stsTokenManager?.accessToken).find(Boolean);
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/kumami-dev/databases/(default)/documents/${docPath}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    return res.status;
  }, { method, docPath, body });
}

test.beforeAll(async () => {
  const p = readPersonas();
  qa0Uid = p.qa0.uid!;
  const { auth, db } = admin();
  // qa4 — the referrer. Created through the Admin SDK (a plain user doc, as sign-up makes).
  const email = `qa4-${Date.now().toString(36)}@${QA_DOMAIN}`;
  const u = await auth.createUser({ email, password: `Qa!${Math.random().toString(36).slice(2)}A9`, emailVerified: true, displayName: 'QA4 Referrer' });
  qa4Uid = u.uid;
  await db.collection('users').doc(qa4Uid).set({ email, displayName: 'QA4 Referrer', role: 'user', isAdmin: false, isPremium: false, createdAt: Timestamp.now() });
  [qa0Token, qa4Token] = await Promise.all([idTokenFor(qa0Uid), idTokenFor(qa4Uid)]);
});

// ---------------------------------------------------------------------------
// Referral codes
// ---------------------------------------------------------------------------

test.describe('referral codes', () => {
  test.use({ storageState: AUTH.fresh });

  test('qa0 (new sign-up) has an 8-character code from the allowed alphabet, shown in Profile → Referrals and stable on reload', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/profile?tab=referrals', { ready: '[data-testid="ref-code"]' });
    const code = (await page.getByTestId('ref-code').innerText()).trim();
    expect(code).toMatch(new RegExp(`^[${ALPHABET}]{8}$`));
    await page.reload();
    await expect(page.getByTestId('ref-code')).toHaveText(code);
    qa0Code = code;
    expect((await admin().db.collection('referralCodes').doc(code).get()).get('userId')).toBe(qa0Uid);
    expect((await user(qa0Uid)).referralCode).toBe(code);
    await expect(page.getByTestId('ref-link')).toHaveValue(new RegExp(`/world/subscribe\\?ref=${code}$`));
    await expect(page.getByTestId('ref-balance')).toHaveText('$0.00');
    await expectSaneText(page, [/^\$0\.00$/]); // a new account's referral balance really is $0.00
    await snap(page, info, 'referrals-empty');
    g.assertClean();
  });

  test('GET /referral/me creates qa4’s code on first call and returns the same one after', async ({ request }) => {
    const a = await api(request, '/referral/me', qa4Token);
    expect(a.status).toBe(200);
    expect(a.body.code).toMatch(new RegExp(`^[${ALPHABET}]{8}$`));
    const b = await api(request, '/referral/me', qa4Token);
    expect(b.body.code).toBe(a.body.code);
    expect(a.body.links.app).toBe(`kumami://subscribe?ref=${a.body.code}`);
    expect(a.body.withdrawalsAvailable).toBe(false);
    qa4Code = a.body.code;
  });

  test('validate: friend’s code valid · unknown not_found · own code own_code · junk malformed', async ({ request }) => {
    expect((await api(request, `/referral/validate?code=${qa4Code}`, qa0Token)).body).toEqual({ valid: true, reason: null });
    expect((await api(request, '/referral/validate?code=ZZZZZZZZ', qa0Token)).body).toEqual({ valid: false, reason: 'not_found' });
    expect((await api(request, `/referral/validate?code=${qa0Code}`, qa0Token)).body).toEqual({ valid: false, reason: 'own_code' });
    expect((await api(request, '/referral/validate?code=abc', null)).body).toEqual({ valid: false, reason: 'malformed' });
  });

  test('referral link pre-fills the Subscribe page and the hint reacts to valid / own / unknown codes', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, `/world/subscribe?ref=${qa4Code}`, { ready: '[data-testid="referral-input"]' });
    await expect(page.getByTestId('referral-input')).toHaveValue(qa4Code);
    await expect(page.getByTestId('referral-hint')).toContainText('Code applied', { timeout: 10_000 });
    await page.getByTestId('referral-input').fill(qa0Code);
    await expect(page.getByTestId('referral-hint')).toContainText('your own code');
    await page.getByTestId('referral-input').fill('ZZZZZZZZ');
    await expect(page.getByTestId('referral-hint')).toContainText('doesn’t exist');
    await expect(page.getByTestId('pay-card')).toBeDisabled(); // a bad code blocks checkout
    await snap(page, info, 'subscribe-bad-code');
    g.assertClean();
  });
});

test('signed-out visitor opening a referral link is sent to sign in with the link kept for afterwards', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/world/subscribe?ref=ABCDEFGH');
  await page.waitForURL((u) => !u.pathname.startsWith('/world/subscribe'), { timeout: 20_000 });
  const saved = await page.evaluate(() => sessionStorage.getItem('redirectAfterSignup'));
  expect(saved).toBe('/world/subscribe?ref=ABCDEFGH');
  await ctx.close();
});

// ---------------------------------------------------------------------------
// Subscribe page
// ---------------------------------------------------------------------------

test.describe('subscribe page', () => {
  test.use({ storageState: AUTH.fresh });

  test('shows Monthly $19.99 and Yearly $199.99 only — no Lifetime, no junk values', async ({ page }, info) => {
    const g = guard(page);
    await openPage(page, '/world/subscribe', { ready: '[data-testid="plan-monthly"]' });
    await expect(page.getByTestId('plan-monthly')).toContainText('$19.99');
    await expect(page.getByTestId('plan-yearly')).toContainText('$199.99');
    await expect(page.getByText(/lifetime/i)).toHaveCount(0);
    await expect(page.getByTestId('pay-card')).toContainText('$199.99'); // yearly preselected
    await page.getByTestId('plan-monthly').click();
    await expect(page.getByTestId('pay-card')).toContainText('$19.99');
    await expect(page.getByTestId('pay-crypto')).toContainText('$19.99');
    await expectSaneText(page);
    await snap(page, info, 'subscribe');
    g.assertClean();
  });

  test('card checkout without Stripe keys answers 503 billing_not_configured (not a crash)', async ({ request }) => {
    test.skip(hasStripe, 'Stripe keys present — the real Stripe flow below covers this');
    const r = await api(request, '/checkout/stripe', qa0Token, { method: 'POST', body: { plan: 'monthly' } });
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe('billing_not_configured');
  });

  test('checkout input is validated: bad plan 400, bad code 400, no token 401', async ({ request }) => {
    expect((await api(request, '/checkout/crypto', qa0Token, { method: 'POST', body: { plan: 'lifetime' } })).status).toBe(400);
    expect((await api(request, '/checkout/crypto', null, { method: 'POST', body: { plan: 'monthly' } })).status).toBe(401);
    if (process.env.NOWPAYMENTS_API_KEY) {
      const r = await api(request, '/checkout/crypto', qa0Token, { method: 'POST', body: { plan: 'monthly', referralCode: qa0Code } });
      expect(r.body.error.code).toBe('invalid_referral_code');
    }
  });
});

// ---------------------------------------------------------------------------
// Crypto (NOWPayments IPN) — payment, referral, replay, stacking, security, refund
// ---------------------------------------------------------------------------

test.describe('crypto payments', () => {
  let firstOrder = '';
  let firstPayment = 0;

  test('unsigned or tampered IPNs are rejected (401) and change nothing', async ({ request }) => {
    const orderId = await seedCryptoOrder(qa0Uid, 'yearly', qa4Code);
    firstOrder = orderId;
    const body = ipnBody(orderId, 'yearly');
    expect((await sendIpn(request, body, null)).status()).toBe(401);
    expect((await sendIpn(request, body, 'deadbeef')).status()).toBe(401);
    const good = createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!).update(JSON.stringify(sortDeep(body))).digest('hex');
    expect((await sendIpn(request, { ...body, price_amount: 1 }, good)).status()).toBe(401); // body changed after signing
    expect((await user(qa0Uid)).isPremium).toBe(false);
  });

  test('partially_paid gives no Pro', async ({ request }) => {
    const r = await sendIpn(request, ipnBody(firstOrder, 'yearly', 'partially_paid'));
    expect(r.status()).toBe(200);
    expect((await user(qa0Uid)).isPremium).toBe(false);
    expect((await admin().db.collection('checkout_orders').doc(firstOrder).get()).get('status')).toBe('partially_paid');
  });

  test('finished Yearly with qa4’s code → qa0 Pro for 365 days; qa0 and qa4 each credited $10', async ({ request }) => {
    const body = ipnBody(firstOrder, 'yearly');
    firstPayment = body.payment_id;
    const before = Date.now();
    const r = await sendIpn(request, body);
    expect(r.status()).toBe(200);
    expect((await r.json()).detail).toBe('paid+referral');
    const u0 = await user(qa0Uid);
    expect(u0).toMatchObject({ isPremium: true, proSource: 'crypto', plan: 'yearly', subscriptionStatus: 'active', referralBalanceCents: 1000, referredBy: qa4Uid });
    const until = (u0.proUntil as Timestamp).toMillis();
    expect(until).toBeGreaterThanOrEqual(before + 365 * DAY - 5_000);
    expect(until).toBeLessThanOrEqual(Date.now() + 365 * DAY + 5_000);
    const u4 = await user(qa4Uid);
    expect(u4).toMatchObject({ referralBalanceCents: 1000, referralCount: 1 });
    expect(await ledgerSum(qa0Uid)).toBe(1000);
    expect(await ledgerSum(qa4Uid)).toBe(1000);
    expect((await admin().db.collection('referral_rewards').doc(qa0Uid).get()).get('status')).toBe('credited');
    expect((await admin().db.collection('checkout_orders').doc(firstOrder).get()).get('status')).toBe('paid');
    expect((await admin().db.collection('payments').doc(`np_${firstPayment}`).get()).get('amountCents')).toBe(19999);
  });

  test('the same IPN again is a duplicate — no second credit, no extra days', async ({ request }) => {
    const before = await user(qa0Uid);
    const r = await sendIpn(request, ipnBody(firstOrder, 'yearly', 'finished', firstPayment));
    expect((await r.json()).status).toBe('duplicate');
    const after = await user(qa0Uid);
    expect((after.proUntil as Timestamp).toMillis()).toBe((before.proUntil as Timestamp).toMillis());
    expect((await user(qa4Uid)).referralBalanceCents).toBe(1000);
  });

  test('API reflects it: /me/subscription crypto Pro; /referral/me balances $10 with history', async ({ request }) => {
    const s = await api(request, '/me/subscription', qa0Token);
    expect(s.body).toMatchObject({ isPro: true, source: 'crypto', plan: 'yearly', canCancel: false, showRenewReminder: false });
    const r0 = await api(request, '/referral/me', qa0Token);
    expect(r0.body.balanceCents).toBe(1000);
    expect(r0.body.ledger[0]).toMatchObject({ amountCents: 1000, type: 'referral_referee' });
    const r4 = await api(request, '/referral/me', qa4Token);
    expect(r4.body).toMatchObject({ balanceCents: 1000, referralCount: 1 });
    expect(r4.body.ledger[0].type).toBe('referral_referrer');
  });

  test('a second crypto purchase (Monthly, same code) stacks 30 days and pays no second referral', async ({ request }) => {
    const before = ((await user(qa0Uid)).proUntil as Timestamp).toMillis();
    const orderId = await seedCryptoOrder(qa0Uid, 'monthly', qa4Code);
    const r = await sendIpn(request, ipnBody(orderId, 'monthly'));
    expect((await r.json()).detail).toBe('paid');
    const after = ((await user(qa0Uid)).proUntil as Timestamp).toMillis();
    expect(after - before).toBe(30 * DAY);
    expect((await user(qa4Uid)).referralBalanceCents).toBe(1000);
  });

  test('a mismatched amount goes to review and grants nothing', async ({ request }) => {
    const before = ((await user(qa0Uid)).proUntil as Timestamp).toMillis();
    const orderId = await seedCryptoOrder(qa0Uid, 'yearly', null);
    const r = await sendIpn(request, { ...ipnBody(orderId, 'yearly'), price_amount: 19.99 });
    expect((await r.json()).detail).toBe('amount_mismatch');
    expect(((await user(qa0Uid)).proUntil as Timestamp).toMillis()).toBe(before);
    expect((await admin().db.collection('checkout_orders').doc(orderId).get()).get('status')).toBe('review');
  });

  test.describe('UI as qa0 (Pro via crypto)', () => {
    test.use({ storageState: AUTH.fresh });

    test('Profile → Subscription shows Pro (crypto) with the end date and an “Add more time” action', async ({ page }, info) => {
      const g = guard(page);
      await openPage(page, '/world/profile?tab=subscription', { ready: '[data-testid="sub-active"]' });
      await expect(page.getByTestId('sub-status')).toHaveText('Active');
      const until = ((await user(qa0Uid)).proUntil as Timestamp).toDate();
      await expect(page.getByTestId('sub-date')).toHaveText(until.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
      await expect(page.getByText('Crypto (NOWPayments)')).toBeVisible();
      await expect(page.getByTestId('sub-cancel')).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Add more time' })).toBeVisible();
      await expectSaneText(page);
      await snap(page, info, 'profile-subscription-crypto');
      g.assertClean();
    });

    test('Profile → Referrals shows $10.00, 0 friends, and the credit in history', async ({ page }, info) => {
      await openPage(page, '/world/profile?tab=referrals', { ready: '[data-testid="ref-balance"]' });
      await expect(page.getByTestId('ref-balance')).toHaveText('$10.00');
      await expect(page.getByTestId('ref-count')).toHaveText('0');
      await expect(page.getByTestId('ref-ledger')).toContainText('You subscribed with a friend’s code');
      await expect(page.getByTestId('ref-ledger')).toContainText('+$10.00');
      await snap(page, info, 'profile-referrals-credited');
    });

    test('Pro tabs are unlocked for qa0 now', async ({ page }) => {
      await openPage(page, '/world/pro?tab=research');
      await expect(page.locator('.w-locked-card')).toHaveCount(0);
    });

    test('Subscribe page says you already have Pro and blocks card checkout', async ({ page }) => {
      await openPage(page, '/world/subscribe', { ready: '[data-testid="already-pro"]' });
      await expect(page.getByTestId('already-pro')).toContainText('(crypto)');
      await expect(page.getByTestId('pay-card')).toBeDisabled();
      await expect(page.getByTestId('pay-crypto')).toBeEnabled(); // crypto may extend crypto
    });

    test('crypto ending in 3 days → banner + Profile reminder; 10 days → none', async ({ page }, info) => {
      const { db } = admin();
      const real = (await user(qa0Uid)).proUntil as Timestamp;
      try {
        await db.collection('users').doc(qa0Uid).update({ proUntil: Timestamp.fromMillis(Date.now() + 3 * DAY) });
        await page.addInitScript(() => localStorage.removeItem('kumami_renew_banner_dismissed'));
        await openPage(page, '/world/profile?tab=subscription', { ready: '[data-testid="sub-active"]' });
        await expect(page.getByTestId('renew-banner')).toContainText('ends in 3 days');
        await expect(page.getByTestId('renew-reminder')).toBeVisible();
        await snap(page, info, 'renew-banner');
        await db.collection('users').doc(qa0Uid).update({ proUntil: Timestamp.fromMillis(Date.now() + 10 * DAY) });
        await page.reload();
        await expect(page.getByTestId('sub-active')).toBeVisible();
        await expect(page.getByTestId('renew-banner')).toHaveCount(0);
        await expect(page.getByTestId('renew-reminder')).toHaveCount(0);
      } finally {
        await db.collection('users').doc(qa0Uid).update({ proUntil: real });
      }
    });

    test('Firestore rules: qa0 cannot write billing/referral fields or records, and can read only their own', async ({ page }) => {
      await openPage(page, '/world/profile');
      const patch = (field: string, value: unknown) => firestoreAs(page, 'PATCH', `users/${qa0Uid}?updateMask.fieldPaths=${field}`, { fields: { [field]: value } });
      expect(await patch('proUntil', { timestampValue: '2099-01-01T00:00:00Z' }), 'extend own Pro').toBe(403);
      expect(await patch('isPremium', { booleanValue: false }), 'old client Unsubscribe path').toBe(403);
      expect(await patch('subscriptionStatus', { stringValue: 'cancelled' }), 'status').toBe(403);
      expect(await patch('referralBalanceCents', { integerValue: '999999' }), 'balance').toBe(403);
      expect(await patch('referralCode', { stringValue: 'HACKHACK' }), 'code').toBe(403);
      expect(await patch('stripeCustomerId', { stringValue: 'cus_x' }), 'stripe id').toBe(403);
      expect(await patch('displayName', { stringValue: 'QA0 New' }), 'own name is allowed').toBe(200);
      expect(await firestoreAs(page, 'POST', 'payments', { fields: { userId: { stringValue: qa0Uid } } }), 'create payment').toBe(403);
      expect(await firestoreAs(page, 'POST', 'referral_ledger', { fields: { userId: { stringValue: qa0Uid }, amountCents: { integerValue: '100000' } } }), 'create ledger').toBe(403);
      expect(await firestoreAs(page, 'PATCH', 'referralCodes/HACKHACK', { fields: { userId: { stringValue: qa0Uid } } }), 'create code').toBe(403);
      expect(await firestoreAs(page, 'GET', `referralCodes/${qa4Code}`), 'read another’s code').toBe(403);
      expect(await firestoreAs(page, 'GET', `payments/np_${firstPayment}`), 'read own payment').toBe(200);
      expect(await firestoreAs(page, 'GET', `referral_ledger/${qa0Uid}_referrer`), 'read qa4’s ledger row').toBe(403);
      expect(await firestoreAs(page, 'GET', `checkout_orders/${firstOrder}`), 'read own order').toBe(200);
    });
  });

  test('refund of the rewarded payment reverses both credits and takes back the 365 days', async ({ request }) => {
    const before = ((await user(qa0Uid)).proUntil as Timestamp).toMillis();
    const r = await sendIpn(request, ipnBody(firstOrder, 'yearly', 'refunded', firstPayment));
    expect((await r.json()).detail).toBe('refunded+referral_reversed');
    const u0 = await user(qa0Uid);
    expect((u0.proUntil as Timestamp).toMillis()).toBe(before - 365 * DAY);
    expect(u0.referralBalanceCents).toBe(0);
    expect((await user(qa4Uid))).toMatchObject({ referralBalanceCents: 0, referralCount: 0 });
    expect(await ledgerSum(qa0Uid)).toBe(0);
    expect(await ledgerSum(qa4Uid)).toBe(0);
    expect((await admin().db.collection('referral_rewards').doc(qa0Uid).get()).get('status')).toBe('reversed');
  });
});

// ---------------------------------------------------------------------------
// API auth + Kuma chat
// ---------------------------------------------------------------------------

test('every signed-in /api/v1 route answers 401 without a token', async ({ request }) => {
  for (const [method, path] of [
    ['GET', '/me/subscription'], ['GET', '/referral/me'], ['POST', '/checkout/stripe'], ['POST', '/checkout/crypto'],
    ['GET', '/checkout/x'], ['POST', '/subscription/cancel'], ['POST', '/subscription/resume'], ['POST', '/subscription/payment-method'],
    ['POST', '/kuma/chat'], ['POST', '/admin/news/x/notify'],
  ] as const) {
    const r = await api(request, path, null, { method, body: method === 'POST' ? {} : undefined });
    expect(r.status, `${method} ${path}`).toBe(401);
    expect(r.body.error.code).toBe('unauthorized');
  }
  expect((await api(request, '/plans', null)).status).toBe(200);
});

test('subscription manage routes refuse users without a card subscription (409)', async ({ request }) => {
  test.skip(!hasStripe, 'needs Stripe keys (route resolves Stripe before answering)');
  expect((await api(request, '/subscription/cancel', qa4Token, { method: 'POST' })).status).toBe(409);
});

test('another user cannot read qa0’s order', async ({ request }) => {
  expect((await api(request, `/checkout/${orders[0]}`, qa4Token)).status).toBe(404);
  expect((await api(request, `/checkout/${orders[0]}`, qa0Token)).status).toBe(200);
});

test('news push endpoint is for publishers only', async ({ request }) => {
  expect((await api(request, '/admin/news/anything/notify', qa4Token, { method: 'POST' })).status).toBe(403);
});

test('Kuma callback: rejected without / with a wrong token, accepted with the token for that user + room', async ({ request }) => {
  const secret = process.env.KUMA_CALLBACK_SECRET!;
  const room = `qa_room_${Date.now()}`;
  const sign = (uid: string, r: string) => {
    const exp = Date.now() + 10 * 60_000;
    return `${exp}.${createHmac('sha256', secret).update(`${uid}\n${r}\n${exp}`).digest('base64url')}`;
  };
  const body = { userId: qa4Uid, chatRoomId: room, aiResponse: 'QA reply' };
  expect((await request.post('/api/v1/kuma/callback', { data: body })).status()).toBe(401);
  expect((await request.post(`/api/v1/kuma/callback?token=${encodeURIComponent(sign(qa4Uid, 'other'))}`, { data: body })).status()).toBe(401);
  expect((await request.post(`/api/v1/kuma/callback?token=${encodeURIComponent(sign(qa0Uid, room))}`, { data: body })).status()).toBe(401);
  const ok = await request.post(`/api/v1/kuma/callback?token=${encodeURIComponent(sign(qa4Uid, room))}`, { data: body });
  expect(ok.status()).toBe(200);
  const msgs = await admin().db.collection('users').doc(qa4Uid).collection('chatrooms').doc(room).collection('messages').get();
  expect(msgs.docs.map((d) => d.data())).toEqual([expect.objectContaining({ role: 'assistant', message: 'QA reply' })]);
});

test('Kuma chat saves the message under the TOKEN’s user (a body userId is ignored) and hands it to n8n', async ({ request }) => {
  const room = `qa_chat_${Date.now()}`;
  const r = await api(request, '/kuma/chat', qa4Token, { method: 'POST', body: { message: 'QA ping', chatRoomId: room, userId: qa0Uid } });
  expect([202, 502]).toContain(r.status); // 502 = n8n unreachable from this machine
  const mine = await admin().db.collection('users').doc(qa4Uid).collection('chatrooms').doc(room).collection('messages').get();
  expect(mine.docs.map((d) => d.get('message'))).toContain('QA ping');
  const theirs = await admin().db.collection('users').doc(qa0Uid).collection('chatrooms').doc(room).collection('messages').get();
  expect(theirs.size).toBe(0);
  if (r.status === 502) test.info().annotations.push({ type: 'n8n', description: 'n8n chat webhook unreachable — reply path not exercised' });
});

// ---------------------------------------------------------------------------
// Stripe (real test-mode flow) — runs once STRIPE_* test keys are in .env.local
// ---------------------------------------------------------------------------

test.describe('Stripe card flow', () => {
  test.skip(!hasStripe, 'Stripe test keys not configured yet — see testing/payments/how-to-test.md');
  test.use({ storageState: AUTH.plus });

  test('card checkout opens Stripe Checkout for a non-subscriber', async ({ page }) => {
    await openPage(page, '/world/subscribe', { ready: '[data-testid="pay-card"]' });
    await page.getByTestId('plan-monthly').click();
    await page.getByTestId('pay-card').click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await expect(page.getByText('$19.99').first()).toBeVisible();
  });
});

test.afterAll(async () => {
  // qa4 is removed by the next run's cleanup (qa4-<run>@ matches the throw-away pattern);
  // remove now too so referral docs don't linger.
  const { deleteAccount } = await import('../personas');
  if (qa4Uid) await deleteAccount(qa4Uid);
});
