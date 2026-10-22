/**
 * AI layer (Rachelle v1.15 Platform): Gemini with a 15–30 min shared cache. It
 * only rewrites text from the computed verdicts. There is NO template fallback
 * (Andrew's hard rule, 22 Oct 2026): when the AI is off or fails, callers get null
 * and the page says "AI read · coming soon" / "unavailable" instead.
 *
 * Env: AI_ENABLED=true switches it on (off by default until Gemini billing is on),
 * GEMINI_API_KEY, GEMINI_MODEL (default gemini-3.5-flash-lite).
 *
 * Quota: on HTTP 429 the layer stops calling for the retry time Google gives
 * (capped at 6h), shared through the market cache, so a used-up quota means
 * "unavailable" — not a failed call on every page view. The free tier allows
 * only ~20 calls/day per model (found 21 Oct 2026); production needs billing on.
 */
import 'server-only';

import { createHash } from 'node:crypto';
import { getCachedFresh, peekCached, setCached } from '../cache';
import { cleanSentence, newsTonePrompt, parseTones, type Tone } from './aiText';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 8_000;

/** The AI layer runs only when switched on AND a key is set. */
export function aiEnabled(): boolean {
  return process.env.AI_ENABLED === 'true' && !!process.env.GEMINI_API_KEY;
}

/** For payloads: 'off' (not switched on) vs 'unavailable' (on, but this call failed). */
export function aiStatus(text: unknown): 'ok' | 'off' | 'unavailable' {
  return !aiEnabled() ? 'off' : text ? 'ok' : 'unavailable';
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
  if (!key || !aiEnabled()) throw new Error('AI layer is off');
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
 * One AI sentence, cached `ttlSec` under `cacheKey` — the key should change only
 * when the facts need a new sentence (e.g. verdict + rounded inputs). null when the
 * AI is off or fails; nothing is ever cached in its place.
 */
export async function aiSentence(cacheKey: string, prompt: string, ttlSec = 1200): Promise<string | null> {
  if (!aiEnabled()) return null;
  try {
    return await getCachedFresh(`ai:v1:${cacheKey}`, ttlSec, async () => {
      const s = cleanSentence(await geminiText(prompt));
      if (!s) throw new Error('unusable AI sentence');
      return s;
    });
  } catch (err) {
    console.error('[ai] sentence unavailable:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Fear & Greed News Tone (v1.15 Plus §4): the AI labels the same headlines the
 * keyword count used. Cached 30 min per headline set; null = AI off or failed
 * (News Tone then shows as unavailable and is left out of the composite).
 */
export async function aiHeadlineTones(headlines: string[]): Promise<Tone[] | null> {
  if (!aiEnabled() || headlines.length === 0) return null;
  const key = createHash('sha1').update(headlines.join('\n')).digest('hex').slice(0, 16);
  try {
    return await getCachedFresh(`ai:v1:tones:${key}`, 1800, async () => {
      const tones = parseTones(await geminiText(newsTonePrompt(headlines), { maxTokens: 30 + headlines.length * 8, json: true }), headlines.length);
      if (!tones) throw new Error('unusable tone labels');
      return tones;
    });
  } catch (err) {
    console.error('[ai] news tone unavailable:', err instanceof Error ? err.message : err);
    return null;
  }
}
