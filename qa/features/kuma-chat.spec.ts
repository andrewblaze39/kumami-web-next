/**
 * QA — Kuma AI chat end to end (27 Oct 2026): the real dock → /api/v1/kuma/chat
 * → n8n "Kuma AI Agent" (Gemini + CoinMarketCap + Supabase knowledge) → reply
 * back through /api/v1/kuma/callback → Firestore → dock.
 *
 * n8n can only call back to a public address, so run the server with
 * `npm run dev:kuma -- --port <p>` and `QA_PORT=<p>`.
 * KUMA_SET=smoke (default) asks one market question; KUMA_SET=knowledge asks the
 * company-knowledge test questions (qa/fixtures/kuma-questions.json). Every
 * question and answer is written to the test output (kuma-answers.json); an
 * answer missing an expected phrase is a soft failure to read, not a crash.
 */
import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { AUTH, openPage, snap } from '../helpers';

type Question = { q: string; expect: string[] };
const SETS: Record<string, Question[]> = JSON.parse(fs.readFileSync('qa/fixtures/kuma-questions.json', 'utf8'));
const SET = process.env.KUMA_SET ?? 'smoke';
const BOT = '.w-kuma-msg-bot .w-kuma-bubble:not(.w-kuma-typing-bubble)';

test.describe('Kuma AI chat', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('Pro user', () => {
    test.use({ storageState: AUTH.pro });

    test(`answers every question (${SET})`, async ({ page }, info) => {
      const questions = SETS[SET];
      expect(questions, `unknown KUMA_SET ${SET}`).toBeTruthy();
      test.setTimeout(questions.length * 150_000 + 60_000);
      await openPage(page, '/world/console');
      await page.locator('.w-kuma-fab').click();
      const input = page.getByLabel('Message Kuma AI');
      await expect(input).toBeVisible();

      const results: { q: string; answer: string | null; seconds: number; missing: string[] }[] = [];
      for (const [i, item] of questions.entries()) {
        const before = await page.locator(BOT).count();
        const t0 = Date.now();
        await input.fill(item.q);
        await page.getByRole('button', { name: 'Send' }).click();
        let answer: string | null = null;
        try {
          await expect(page.locator(BOT)).toHaveCount(before + 1, { timeout: 120_000 });
          answer = await page.locator(BOT).last().innerText();
        } catch { /* recorded as no reply */ }
        const missing = answer ? item.expect.filter((p) => !new RegExp(p, 'i').test(answer!)) : item.expect;
        results.push({ q: item.q, answer, seconds: Math.round((Date.now() - t0) / 1000), missing });
        await snap(page, info, `kuma-${SET}-${String(i + 1).padStart(2, '0')}`);
        expect.soft(answer, `no reply to "${item.q}"`).toBeTruthy();
        expect.soft(missing, `"${item.q}" answer lacks expected facts`).toEqual([]);
      }
      const file = info.outputPath('kuma-answers.json');
      fs.writeFileSync(file, JSON.stringify(results, null, 2));
      await info.attach('kuma-answers', { path: file, contentType: 'application/json' });
      expect(results.every((r) => r.answer), 'every question got a reply').toBe(true);
    });
  });

  test.describe('Plus user', () => {
    test.use({ storageState: AUTH.plus });

    test('sees the locked dock, no input', async ({ page }, info) => {
      await openPage(page, '/world/console');
      await page.locator('.w-kuma-fab').click();
      await expect(page.locator('.w-kuma-lock')).toBeVisible();
      await expect(page.getByLabel('Message Kuma AI')).toHaveCount(0);
      await snap(page, info, 'kuma-locked-plus');
    });
  });
});
