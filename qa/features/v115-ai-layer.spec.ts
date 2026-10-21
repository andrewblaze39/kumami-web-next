/**
 * QA — v1.15 AI layer: Console sentence under the regime, AI-scored News Tone.
 */
import { expect, test } from '@playwright/test';
import { AUTH, apiAsUser, expectSaneText, guard, openPage, snap } from '../helpers';

test.use({ storageState: AUTH.plus });

test('Console shows an AI read under the regime that matches the verdict; News Tone is AI-scored', async ({ page }, info) => {
  test.setTimeout(180_000);
  const g = guard(page);
  await openPage(page, '/world/console');
  const { body } = await apiAsUser<{ marketConditions: { verdict: { label: string }; interpretation?: string; interpretationAi?: boolean } }>(page, '/api/market/console');
  const mc = body.marketConditions;
  expect(mc.interpretation, 'sentence present').toBeTruthy();
  expect(mc.interpretation!.length).toBeLessThanOrEqual(320);
  expect(mc.interpretation).not.toMatch(/coinglass/i);
  await expect(page.locator('.w-mc-ai')).toHaveText(mc.interpretation!);
  const fg = await apiAsUser<{ subMetrics: { newsTone: { source: string; estimated?: boolean; unavailable?: boolean } } }>(page, '/api/market/fear-greed');
  const nt = fg.body.subMetrics.newsTone;
  await info.attach('ai', { body: JSON.stringify({ verdict: mc.verdict.label, ai: mc.interpretationAi, sentence: mc.interpretation, newsTone: nt }, null, 1), contentType: 'application/json' });
  if (!nt.unavailable) expect(nt.source).toMatch(/AI-scored headlines|Keyword estimate/);
  expect(mc.interpretationAi, 'Gemini key is set — the AI path should be used').toBe(true);
  await expectSaneText(page);
  await snap(page, info, 'v115-ai-console');
  g.assertClean();
});

test('Flow Radar: the AI sentence under the verdict band matches the page band for the default 24H window', async ({ page }, info) => {
  test.setTimeout(180_000);
  const g = guard(page);
  await openPage(page, '/world/flow-radar');
  const { body } = await apiAsUser<{ aiSentences?: Record<string, { verdict: string; text: string }> }>(page, '/api/market/flow-radar');
  await info.attach('flow-ai', { body: JSON.stringify(body.aiSentences ?? null, null, 1), contentType: 'application/json' });
  const ai = body.aiSentences?.['24H'];
  expect(ai, 'Gemini key is set — the 24H sentence should be present').toBeTruthy();
  expect(ai!.text).not.toMatch(/coinglass/i);
  const label = (await page.locator('.w-flow-radar-verdict-label').innerText()).trim();
  if (label === ai!.verdict) await expect(page.locator('.w-flow-radar-verdict p')).toHaveText(ai!.text);
  await snap(page, info, 'v115-ai-flow-radar');
  g.assertClean();
});
