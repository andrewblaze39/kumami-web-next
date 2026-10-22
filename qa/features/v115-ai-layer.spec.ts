/**
 * QA — v1.15 AI layer: Console sentence under the regime, Flow Radar sentence under
 * the verdict band, AI-scored News Tone. Andrew's hard rule (22 Oct 2026): no
 * template stand-in anywhere — with the AI off each spot says "AI read · coming
 * soon" and News Tone is left out of the composite. Works with AI on or off.
 */
import { expect, test } from '@playwright/test';
import { AUTH, apiAsUser, expectSaneText, guard, openPage, snap } from '../helpers';

test.use({ storageState: AUTH.plus });

test('Console: AI read or an honest "coming soon"; News Tone never a keyword estimate', async ({ page }, info) => {
  test.setTimeout(180_000);
  const g = guard(page);
  await openPage(page, '/world/console');
  const { body } = await apiAsUser<{ marketConditions: { verdict: { label: string }; interpretation?: string; aiStatus?: string } }>(page, '/api/market/console');
  const mc = body.marketConditions;
  const read = page.locator('.w-mc-ai');
  if (mc.aiStatus === 'ok') {
    expect(mc.interpretation!.length).toBeLessThanOrEqual(320);
    expect(mc.interpretation).not.toMatch(/coinglass/i);
    await expect(read).toHaveText(mc.interpretation!);
  } else {
    expect(mc.interpretation, 'no template sentence when the AI is off').toBeUndefined();
    await expect(read).toHaveText(mc.aiStatus === 'off' ? 'AI read · coming soon' : 'AI read unavailable right now');
  }
  await expect(page.getByText(/AI confidence|AI-fused/)).toHaveCount(0);
  const fg = await apiAsUser<{ subMetrics: { newsTone: { source: string; unavailable?: boolean } } }>(page, '/api/market/fear-greed');
  const nt = fg.body.subMetrics.newsTone;
  await info.attach('ai', { body: JSON.stringify({ verdict: mc.verdict.label, aiStatus: mc.aiStatus, sentence: mc.interpretation, newsTone: nt }, null, 1), contentType: 'application/json' });
  expect(nt.source).not.toMatch(/Keyword/);
  if (nt.unavailable) expect(nt.source).toMatch(/coming soon|unavailable/);
  else expect(nt.source).toMatch(/AI-scored headlines/);
  await expectSaneText(page);
  await snap(page, info, 'v115-ai-console');
  g.assertClean();
});

test('Flow Radar: AI sentence under the band, or "coming soon" — never a template sentence', async ({ page }, info) => {
  test.setTimeout(180_000);
  const g = guard(page);
  await openPage(page, '/world/flow-radar');
  const { body } = await apiAsUser<{ aiOn?: boolean; aiSentences?: Record<string, { verdict: string; text: string }> }>(page, '/api/market/flow-radar');
  await info.attach('flow-ai', { body: JSON.stringify({ aiOn: body.aiOn, aiSentences: body.aiSentences ?? null }, null, 1), contentType: 'application/json' });
  const p = page.locator('.w-flow-radar-verdict p');
  if (body.aiOn === false) {
    expect(Object.keys(body.aiSentences ?? {}).length).toBe(0);
    await expect(p).toHaveText('AI read · coming soon');
  } else {
    const ai = body.aiSentences?.['24H'];
    const label = (await page.locator('.w-flow-radar-verdict-label').innerText()).trim();
    if (ai && label === ai.verdict) await expect(p).toHaveText(ai.text);
    else await expect(p).toHaveCount(0);
  }
  await snap(page, info, 'v115-ai-flow-radar');
  g.assertClean();
});
