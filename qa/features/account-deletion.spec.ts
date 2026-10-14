/**
 * QA — Account deletion (Profile → Delete my account, DELETE /api/v1/me).
 *
 * Every state change happens on throw-away accounts made here with the Admin SDK
 * (qa6-<run>@ = the user who deletes, qa7-<run>@ = a staff account), so the fixed
 * personas are never at risk. Leftovers are removed by the next run's cleanup
 * (deleteFreshAccounts matches qa<digit>-<run>@).
 * qa3 (superadmin) is only used read-only: the staff message in Profile.
 */
import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';
import { AUTH, guard, openPage, snap } from '../helpers';
import { admin, idTokenFor, QA_DOMAIN } from '../personas';
import { signCallbackToken } from '../../src/lib/kuma/callbackToken';
import { CONSENT_STORAGE_KEY } from '../../src/lib/consent';

test.describe.configure({ mode: 'serial' });

const run = () => `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;

async function makeUser(prefix: string, extra: Record<string, unknown> = {}) {
  const { auth, db } = admin();
  const email = `${prefix}-${run()}@${QA_DOMAIN}`;
  const password = `Qa!${randomBytes(9).toString('base64url')}A9`;
  const u = await auth.createUser({ email, password, emailVerified: true, displayName: 'QA6 Leaver' });
  await db.collection('users').doc(u.uid).set({
    email, displayName: 'QA6 Leaver', role: 'user', isAdmin: false, isPremium: false, createdAt: Timestamp.now(), ...extra,
  });
  return { uid: u.uid, email, password };
}

/** The data a real user builds up, in every place the deletion must clear — plus the billing rows it must keep. */
async function seedFootprint(uid: string) {
  const { db } = admin();
  const user = db.collection('users').doc(uid);
  const code = `Q${randomBytes(4).toString('hex').toUpperCase().replace(/[01ILO]/g, 'Z').slice(0, 7)}`;
  await Promise.all([
    user.collection('education_progress').doc('beginner').set({ completed: ['s1'] }),
    user.collection('pro').doc('state').set({ following: { x: true } }),
    user.collection('watchlist').doc('w1').set({ address: '0x0000000000000000000000000000000000000001', label: '[TEST] wallet' }),
    user.collection('chatrooms').doc('room1').set({ chatRoomId: 'room1' }),
    user.collection('chatrooms').doc('room1').collection('messages').doc('m1').set({ role: 'user', message: '[TEST] hi' }),
    db.collection('user_prefs').doc(uid).set({ mode: 'advanced' }),
    db.collection('watchlists').doc(uid).set({ symbols: ['BTC'] }),
    db.collection('alerts').doc(`qa-del-${uid}`).set({ userId: uid, chain: 'eth' }),
    db.collection('referralCodes').doc(code).set({ code, userId: uid }),
    user.set({ referralCode: code }, { merge: true }),
    db.collection('payments').doc(`qa_del_${uid}`).set({ userId: uid, provider: 'crypto', plan: 'monthly', amountCents: 1999, status: 'paid', qa: true }),
    db.collection('checkout_orders').doc(`qa_del_${uid}`).set({ userId: uid, provider: 'crypto', plan: 'monthly', status: 'paid', qa: true }),
    db.collection('referral_ledger').doc(`qa_del_${uid}`).set({ userId: uid, amountCents: 250, type: 'referral_referee', qa: true }),
  ]);
  return code;
}

async function exists(path: string) {
  return (await admin().db.doc(path).get()).exists;
}

async function logIn(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ analytics: false, version: 1, decidedAt: new Date().toISOString() })), CONSENT_STORAGE_KEY);
  await page.reload();
  await page.getByRole('button', { name: /^log in$/i }).first().click();
  const form = page.locator('form').filter({ has: page.locator('input[type="password"]') }).last();
  await form.locator('input[type="email"]').fill(email);
  await form.locator('input[type="password"]').fill(password);
  await form.locator('button[type="submit"]').click();
  await page.waitForURL(/\/world\//, { timeout: 60_000 });
}

test.describe('API guards', () => {
  test('DELETE /api/v1/me without a token → 401', async ({ request }) => {
    const r = await request.delete('/api/v1/me');
    expect(r.status()).toBe(401);
    expect((await r.json()).error.code).toBe('unauthorized');
  });

  test('a staff account is refused (403 staff_account) and nothing is deleted', async ({ request }) => {
    const staff = await makeUser('qa7', { role: 'newsdrafter' });
    const token = await idTokenFor(staff.uid);
    const r = await request.delete('/api/v1/me', { headers: { Authorization: `Bearer ${token}` } });
    expect(r.status()).toBe(403);
    expect((await r.json()).error.code).toBe('staff_account');
    expect(await exists(`users/${staff.uid}`)).toBe(true);
    expect(await admin().auth.getUser(staff.uid).then(() => true, () => false)).toBe(true);
  });
});

test.describe('staff view', () => {
  test.use({ storageState: AUTH.admin });
  test('qa3 sees the staff message, not the delete button', async ({ page }, testInfo) => {
    const g = guard(page);
    await openPage(page, '/world/profile');
    const panel = page.getByTestId('delete-account');
    await expect(panel).toContainText('staff account');
    await expect(panel.getByRole('button', { name: 'Delete my account' })).toHaveCount(0);
    await snap(page, testInfo, 'delete-account-staff');
    g.assertClean();
  });
});

test.describe('self-serve deletion', () => {
  let leaver: { uid: string; email: string; password: string };
  let code = '';

  test.beforeAll(async () => {
    // Crypto Pro + a referral balance → both warnings must show.
    leaver = await makeUser('qa6', {
      isPremium: true, proSource: 'crypto', plan: 'monthly', subscriptionStatus: 'active',
      proUntil: Timestamp.fromMillis(Date.now() + 20 * 86_400_000), referralBalanceCents: 250,
    });
    code = await seedFootprint(leaver.uid);
  });

  test('Profile → Delete my account: warnings, confirm gate, wrong password, then deleted', async ({ page, request }, testInfo) => {
    await logIn(page, leaver.email, leaver.password);
    await openPage(page, '/world/profile');
    const panel = page.getByTestId('delete-account');
    await panel.scrollIntoViewIfNeeded();
    await snap(page, testInfo, 'delete-account-closed');

    // Cancel closes it again.
    await panel.getByRole('button', { name: 'Delete my account' }).click();
    await panel.getByRole('button', { name: 'Cancel' }).click();
    await expect(panel.getByRole('button', { name: 'Delete my account' })).toBeVisible();

    await panel.getByRole('button', { name: 'Delete my account' }).click();
    const warnings = panel.getByTestId('delete-warnings');
    await expect(warnings).toContainText('remaining Pro time is lost');
    await expect(warnings).toContainText('referral balance ($2.50) is lost');
    await expect(panel).toContainText('payment and invoice records');
    const go = panel.getByRole('button', { name: 'Permanently delete my account' });
    await expect(go).toBeDisabled();
    await panel.getByLabel('Type DELETE to confirm').fill('delete'); // must be exact
    await panel.getByLabel('Your password').fill('not-the-password');
    await expect(go).toBeDisabled();
    await panel.getByLabel('Type DELETE to confirm').fill('DELETE');
    await expect(go).toBeEnabled();
    await panel.scrollIntoViewIfNeeded();
    await snap(page, testInfo, 'delete-account-confirm');

    // Wrong password → error, nothing deleted.
    await go.click();
    await expect(panel.getByRole('alert')).toContainText('password is not right');
    expect(await exists(`users/${leaver.uid}`)).toBe(true);

    // Right password → deleted, lands on the gate with the notice.
    await panel.getByLabel('Your password').fill(leaver.password);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'DELETE'),
      go.click(),
    ]);
    expect(res.status()).toBe(200); // body ({ deleted: true, … }) is gone once the page navigates — unit-tested
    await page.waitForURL((u) => u.pathname === '/', { timeout: 30_000 });
    const notice = page.getByRole('status').filter({ hasText: 'Your Kumami account has been deleted.' });
    await expect(notice).toBeVisible();
    // Really on top (not hidden behind the gate, which toBeVisible would miss).
    expect(await notice.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    })).toBe(true);
    await snap(page, testInfo, 'delete-account-done');

    // Deleted everywhere…
    const { auth, db } = admin();
    expect(await auth.getUser(leaver.uid).then(() => true, () => false)).toBe(false);
    for (const p of [
      `users/${leaver.uid}`, `users/${leaver.uid}/education_progress/beginner`, `users/${leaver.uid}/pro/state`,
      `users/${leaver.uid}/watchlist/w1`, `users/${leaver.uid}/chatrooms/room1`, `users/${leaver.uid}/chatrooms/room1/messages/m1`,
      `user_prefs/${leaver.uid}`, `watchlists/${leaver.uid}`, `alerts/qa-del-${leaver.uid}`, `referralCodes/${code}`,
    ]) expect(await exists(p), p).toBe(false);
    // …payment records kept.
    for (const p of [`payments/qa_del_${leaver.uid}`, `checkout_orders/qa_del_${leaver.uid}`, `referral_ledger/qa_del_${leaver.uid}`]) {
      expect(await exists(p), p).toBe(true);
    }

    // A late Kuma reply must not recreate chat data.
    const secret = process.env.KUMA_CALLBACK_SECRET;
    if (secret) {
      const t = signCallbackToken(leaver.uid, 'room1', secret);
      const cb = await request.post(`/api/v1/kuma/callback?token=${encodeURIComponent(t)}`, {
        data: { userId: leaver.uid, chatRoomId: 'room1', aiResponse: '[TEST] late reply' },
      });
      expect(cb.status()).toBe(404);
      expect(await exists(`users/${leaver.uid}/chatrooms/room1`)).toBe(false);
    }

    // The old password no longer signs in.
    await page.goto('/');
    await page.getByRole('button', { name: /^log in$/i }).first().click();
    const form = page.locator('form').filter({ has: page.locator('input[type="password"]') }).last();
    await form.locator('input[type="email"]').fill(leaver.email);
    await form.locator('input[type="password"]').fill(leaver.password);
    await form.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    expect(new URL(page.url()).pathname).toBe('/');
    expect(await exists(`users/${leaver.uid}`)).toBe(false);

    // Clean the kept QA billing rows.
    await Promise.all(['payments', 'checkout_orders', 'referral_ledger'].map((c) => db.collection(c).doc(`qa_del_${leaver.uid}`).delete()));
  });
});
