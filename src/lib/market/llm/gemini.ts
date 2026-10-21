/**
 * AI layer (Rachelle v1.15 Platform): Gemini with a template fallback and a
 * 15–30 min shared cache. It only rewrites text from the computed verdicts —
 * callers always pass a fallback, and any error, timeout or odd answer returns it.
 *
 * Env: GEMINI_API_KEY (already set), GEMINI_MODEL (default gemini-3.5-flash-lite).
 *
 * Quota: on HTTP 429 the layer stops calling for the retry time Google gives
 * (capped at 6h), shared through the market cache, so a used-up quota means
 * template text — not a failed call on every page view. The free tier allows
 * only ~20 calls/day per model (found 21 Oct 2026); production needs billing on.
 */
import 'server-only';

import { createHash } from 'node:crypto';
import { getCachedFresh, peekCached, setCached } from '../cache';
import { cleanSentence, newsTonePrompt, parseTones, type Tone } from './aiText';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 8_000;

export function aiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// Quota cooldown: in memory for this instance, plus a shared cache entry for the others.
const COOLDOWN_KEY = 'ai:v1:cooldown';
let cooldownUntil = 0;

async function startCooldown(secs: number): Promise<void> {
  cooldownUntil = Date.now() + secs * 1000;
  await setCached(COOLDOWN_KEY, cooldownUntil).catch(() => {});
}

async function inCooldown(): Promise<boolean> {
  if (Date.now() < cooldownUntil) return true;
  const shared = await peekCached<number>(COOLDOWN_KEY).catch(() => null);
  if (shared && Date.now() < shared) { cooldownUntil = shared; return true; }
  return false;
}

/** One Gemini call → plain text. Throws on any failure (callers fall back). */
export async function geminiText(prompt: string, opts: { maxTokens?: number; json?: boolean } = {}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  if (await inCooldown()) throw new Error('AI paused (quota cooldown)');
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: opts.maxTokens ?? 200,
          // 2.5 models take a token budget; 3.x models a level (a budget there is a 400).
          thinkingConfig: model.includes('2.5') ? { thinkingBudget: 0 } : { thinkingLevel: 'minimal' },
          ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (res.status === 429) {
      const body = await res.text().catch(() => '');
      const secs = Number(body.match(/"retryDelay":\s*"(\d+)s"/)?.[1] ?? 600);
      await startCooldown(Math.min(Math.max(secs, 60), 6 * 3600));
      throw new Error('Gemini HTTP 429 (quota) — pausing AI calls');
    }
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text.trim()) throw new Error('Gemini returned no text');
    return text;
  } finally {
    clearTimeout(t);
  }
}

/**
 * A cached AI sentence. `cacheKey` must change whenever the facts change enough to
 * need a new sentence (e.g. verdict + rounded inputs). Returns `fallback` (and is
 * never cached as AI text) when the AI is off or fails.
 */
export async function aiSentence(cacheKey: string, prompt: string, fallback: string, ttlSec = 1200): Promise<{ text: string; ai: boolean }> {
  if (!aiConfigured()) return { text: fallback, ai: false };
  try {
    const text = await getCachedFresh(`ai:v1:${cacheKey}`, ttlSec, async () => {
      const s = cleanSentence(await geminiText(prompt));
      if (!s) throw new Error('unusable AI sentence');
      return s;
    });
    return { text, ai: true };
  } catch (err) {
    console.error('[ai] sentence fell back to the template:', err instanceof Error ? err.message : err);
    return { text: fallback, ai: false };
  }
}

/**
 * Fear & Greed News Tone (v1.15 Plus §4): the AI labels the same headlines the
 * keyword count used. Cached 30 min per headline set; null = use the keyword count.
 */
export async function aiHeadlineTones(headlines: string[]): Promise<Tone[] | null> {
  if (!aiConfigured() || headlines.length === 0) return null;
  const key = createHash('sha1').update(headlines.join('\n')).digest('hex').slice(0, 16);
  try {
    return await getCachedFresh(`ai:v1:tones:${key}`, 1800, async () => {
      const tones = parseTones(await geminiText(newsTonePrompt(headlines), { maxTokens: 30 + headlines.length * 8, json: true }), headlines.length);
      if (!tones) throw new Error('unusable tone labels');
      return tones;
    });
  } catch (err) {
    console.error('[ai] news tone fell back to keywords:', err instanceof Error ? err.message : err);
    return null;
  }
}
