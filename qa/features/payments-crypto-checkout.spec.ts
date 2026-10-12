/**
 * QA — crypto checkout in the browser, end to end (spec v1.14 Pro §21–22).
 *
 * Clicks the real "Pay with crypto" button and follows the whole round trip:
 * our API → NOWPayments invoice → invoice page → signed IPNs → success page →
 * Profile. NOWPayments itself is replaced by qa/mocks/nowpayments-mock.mjs, a local
 * stand-in shaped like the sandbox (POST /v1/invoice, hosted page, the IPN sequence
 * waiting → confirming → confirmed → sending → finished, signed with the IPN secret).
 *
 * Runs only when the mock is up and the dev server points at it:
 *   node qa/mocks/nowpayments-mock.mjs            (needs NOWPAYMENTS_IPN_SECRET in env)
 *   NOWPAYMENTS_API_KEY=mock-np-key NOWPAYMENTS_API_BASE=http://localhost:4010/v1 npm run dev
 * With a real sandbox key, test by hand instead (testing/payments/…/how-to-test.md §4).
 *
 * Personas: qa0 = payer (fresh every run), qa5-<run> = throw-away referrer.
 */
import { expect, test, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';
import { AUTH, guard, openPage, snap } from '../helpers';
import { admin, deleteAccount, idTokenFor, readPersonas, QA_DOMAIN } from '../personas';

test.describe.configure({ mode: 'serial' });
test.use({ storageState: AUTH.fresh });

const MOCK = 'http://localhost:4010';
const DAY = 86_400_000;
let mockUp = false;
let qa0Uid = '';
let refUid = '';
let refCode = '';

async function user(uid: string) {
  return (await admin().db.collection('users').doc(uid).get()).data() ?? {};
}
const untilMs = async (uid: string) => ((await user(uid)).proUntil as Timestamp | undefined)?.toMillis() ?? 0;

type MockInvoice = { id: string; order_id: string; price_amount: number; price_currency: string; ipn_callback_url: string; success_url: string; cancel_url: string; is_fee_paid_by_user: boolean };
const lastInvoice = async (): Promise<MockInvoice> => ((await (await fetch(`${MOCK}/invoices`)).json()) as MockInvoice[]).at(-1)!;

/** Subscribe page → pick plan → Pay with crypto → lands on the (mock) invoice page. */
async function startCrypto(page: Page, plan: 'monthly' | 'yearly', ref?: string) {
  await openPage(page, `/world/subscribe${ref ? `?ref=${ref}` : ''}`, { ready: '[data-testid="pay-crypto"]' });
  await page.getByTestId(`plan-${plan}`).click();
  if (ref) await expect(page.getByTestId('referral-hint')).toContainText('Code applied');
  await expect(page.getByTestId('pay-crypto')).toBeEnabled();
  await page.getByTestId('pay-crypto').click();
  await page.waitForURL(/localhost:4010\/invoice\/\d+$/, { timeout: 30_000 });
  return lastInvoice();
}

test.beforeAll(async () => {
  mockUp = await fetch(`${MOCK}/log`).then((r) => r.ok).catch(() => false);
  if (!mockUp) return;
  qa0Uid = readPersonas().qa0.uid!;
  const { auth, db } = admin();
  const email = `qa5-${Date.now().toString(36)}@${QA_DOMAIN}`;
  const u = await auth.createUser({ email, password: `Qa!${Math.random().toString(36).slice(2)}A9`, emailVerified: true, displayName: 'QA5 Referrer' });
  refUid = u.uid;
  await db.collection('users').doc(refUid).set({ email, displayName: 'QA5 Referrer', role: 'user', isAdmin: false, isPremium: false, createdAt: Timestamp.now() });
  const res = await fetch('http://localhost:3000/api/v1/referral/me', { headers: { Authorization: `Bearer ${await idTokenFor(refUid)}` } });
  refCode = ((await res.json()) as { code: string }).code;
});

test.beforeEach(() => test.skip(!mockUp, 'NOWPayments mock not running — see the header of this file'));

test('Pay with crypto creates a correct invoice and opens it; Cancel comes back with nothing charged', async ({ page }, info) => {
  const g = guard(page);
  const inv = await startCrypto(page, 'monthly', refCode);
  expect(inv.price_amount).toBe(19.99);
  expect(inv.price_currency).toBe('usd');
  expect(inv.is_fee_paid_by_user).toBe(true);
  expect(inv.ipn_callback_url).toBe('http://localhost:3000/api/v1/webhooks/nowpayments');
  expect(inv.success_url).toBe(`http://localhost:3000/world/subscribe/success?order=${inv.order_id}`);
  const order = (await admin().db.collection('checkout_orders').doc(inv.order_id).get()).data()!;
  expect(order).toMatchObject({ userId: qa0Uid, provider: 'crypto', plan: 'monthly', amountCents: 1999, referralCode: refCode, status: 'pending', providerRef: inv.id });
  await expect(page.getByTestId('np-desc')).toContainText('Kumami Pro — Monthly (30 days)');
  await snap(page, info, 'np-invoice');

  await page.locator('#np-cancel').click();
  await page.waitForURL(/\/world\/subscribe\?cancelled=1/);
  await expect(page.getByText('Checkout cancelled — you weren’t charged.')).toBeVisible();
  expect((await user(qa0Uid)).isPremium).not.toBe(true);
  g.assertClean();
});

test('paying only part → "only part of the amount" on the success page; no Pro, no credit', async ({ page }, info) => {
  await startCrypto(page, 'monthly');
  await page.locator('#np-part').click();
  await page.waitForURL(/\/world\/subscribe\/success\?order=/);
  await expect(page.getByText(/received only part of the amount/)).toBeVisible({ timeout: 20_000 });
  await snap(page, info, 'np-partial');
  const u = await user(qa0Uid);
  expect(u.isPremium).not.toBe(true);
  expect(u.referralBalanceCents ?? 0).toBe(0);
});

test('a payment with the wrong amount → "doesn’t match" + order in review; no Pro', async ({ page }) => {
  const inv = await startCrypto(page, 'monthly');
  await page.locator('#np-wrong').click();
  await page.waitForURL(/\/world\/subscribe\/success\?order=/);
  await expect(page.getByText(/a payment that doesn’t match the amount/)).toBeVisible({ timeout: 20_000 });
  expect((await admin().db.collection('checkout_orders').doc(inv.order_id).get()).get('status')).toBe('review');
  expect((await user(qa0Uid)).isPremium).not.toBe(true);
});

test('full Monthly payment with a friend’s code → every IPN step accepted, "You’re Pro!", 30 days, $1 each', async ({ page }, info) => {
  const g = guard(page);
  const t0 = Date.now();
  const inv = await startCrypto(page, 'monthly', refCode);
  await page.locator('#np-pay').click();
  await page.waitForURL(/\/world\/subscribe\/success\?order=/);
  await expect(page.getByTestId('success-paid')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('success-paid')).toContainText('Pro is active until');
  await snap(page, info, 'np-success');

  // Every step NOWPayments sends was accepted (200) and only "finished" granted Pro.
  const log = (await (await fetch(`${MOCK}/log`)).json()) as { status?: string; http?: number; res?: string }[];
  const steps = log.slice(-5);
  expect(steps.map((s) => s.status)).toEqual(['waiting', 'confirming', 'confirmed', 'sending', 'finished']);
  expect(steps.every((s) => s.http === 200)).toBe(true);
  expect(JSON.parse(steps[4].res!).data ?? JSON.parse(steps[4].res!)).toMatchObject({ status: 'applied', detail: 'paid+referral' });

  const u = await user(qa0Uid);
  expect(u).toMatchObject({ isPremium: true, proSource: 'crypto', plan: 'monthly', referralBalanceCents: 100 });
  expect(Math.abs((u.proUntil as Timestamp).toMillis() - (t0 + 30 * DAY))).toBeLessThan(5 * 60_000);
  expect(await user(refUid)).toMatchObject({ referralBalanceCents: 100, referralCount: 1 });
  expect((await admin().db.collection('checkout_orders').doc(inv.order_id).get()).get('status')).toBe('paid');

  // "Open Kumami Pro" is a full page load → Pro unlocked.
  await page.getByRole('link', { name: 'Open Kumami Pro' }).click();
  await page.waitForURL(/\/world\/pro/);
  await expect(page.locator('#w-sidebar')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.w-locked-card')).toHaveCount(0);
  g.assertClean();
});

test('Yearly crypto on top stacks 365 days; card stays blocked; no second referral credit', async ({ page }, info) => {
  const before = await untilMs(qa0Uid);
  await openPage(page, '/world/subscribe', { ready: '[data-testid="already-pro"]' });
  await expect(page.getByTestId('already-pro')).toContainText('(crypto)');
  await expect(page.getByTestId('pay-card')).toBeDisabled();
  await startCrypto(page, 'yearly', refCode);
  await page.locator('#np-pay').click();
  await expect(page.getByTestId('success-paid')).toBeVisible({ timeout: 30_000 });
  expect(await untilMs(qa0Uid)).toBe(before + 365 * DAY);
  expect((await user(qa0Uid)).referralBalanceCents).toBe(100);
  expect((await user(refUid)).referralBalanceCents).toBe(100);

  await openPage(page, '/world/profile?tab=subscription', { ready: '[data-testid="sub-active"]' });
  const until = new Date(await untilMs(qa0Uid));
  await expect(page.getByTestId('sub-date')).toHaveText(until.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  await snap(page, info, 'np-stacked');
});

test('refund of the Yearly payment takes the 365 days back and leaves the Monthly credit alone', async () => {
  const before = await untilMs(qa0Uid);
  const inv = await lastInvoice();
  const r = (await (await fetch(`${MOCK}/refund/${inv.id}`)).json()) as { http: number; res: string };
  expect(r.http).toBe(200);
  expect(r.res).toContain('refunded');
  expect(await untilMs(qa0Uid)).toBe(before - 365 * DAY);
  expect((await user(qa0Uid)).referralBalanceCents).toBe(100); // the reward belongs to the Monthly payment
});

test('when the crypto time runs out Pro locks and card checkout opens again', async ({ page }) => {
  const { db } = admin();
  await db.collection('users').doc(qa0Uid).update({ proUntil: Timestamp.fromMillis(Date.now() - 60_000) });
  await openPage(page, '/world/pro?tab=research');
  await expect(page.locator('.w-locked-card').first()).toBeVisible();
  await openPage(page, '/world/subscribe', { ready: '[data-testid="pay-card"]' });
  await expect(page.getByTestId('already-pro')).toHaveCount(0);
  await expect(page.getByTestId('pay-card')).toBeEnabled();
  const sub = await page.evaluate(async () => (await fetch('/api/v1/me/subscription')).status);
  expect(sub).toBe(401); // sanity: the API needs the Bearer token, not cookies
});

test.afterAll(async () => {
  if (refUid) await deleteAccount(refUid);
});
