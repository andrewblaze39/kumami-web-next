/**
 * Lightweight, dependency-free moderation for user-submitted event questions.
 * First-line defence for a publicly-writable field: hard-blocks slurs, censors
 * common profanity, rejects links/spam, and caps length. Not a substitute for
 * server-side moderation, but covers the standard cases before a question is
 * stored. Pair with the client-side rate limiter below.
 */

export const MAX_QUESTION_LEN = 280;

// Hard-blocked (slurs / severe) — submission is rejected outright.
const BLOCKED = [
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'kike', 'spic', 'chink',
  'cunt', 'coon', 'tranny',
];

// Censored (common profanity) — replaced with asterisks, submission allowed.
const CENSORED = [
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'bastard', 'slut',
  'whore', 'motherfucker', 'bullshit', 'wanker', 'prick', 'douche',
];

function normalize(s: string): string {
  // collapse simple leetspeak / repeats to catch obfuscation
  return s
    .toLowerCase()
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/(.)\1{2,}/g, '$1$1'); // "loooong" -> "loong"
}

function hasWord(haystack: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, 'i').test(haystack);
}

function censor(text: string): string {
  let out = text;
  for (const w of CENSORED) {
    out = out.replace(new RegExp(`\\b${w}\\b`, 'gi'), (m) => m[0] + '*'.repeat(Math.max(1, m.length - 1)));
  }
  return out;
}

export interface ModerationResult {
  ok: boolean;
  reason?: string;
  clean: string;
}

export function moderateQuestion(raw: string): ModerationResult {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return { ok: false, reason: 'Enter a question first.', clean: '' };
  if (text.length > MAX_QUESTION_LEN) {
    return { ok: false, reason: `Keep it under ${MAX_QUESTION_LEN} characters.`, clean: '' };
  }
  if (/https?:\/\/|www\.|\b\w+\.(com|net|io|xyz|org)\b/i.test(text)) {
    return { ok: false, reason: 'Links aren’t allowed in questions.', clean: '' };
  }
  const norm = normalize(text);
  if (BLOCKED.some((w) => hasWord(norm, w))) {
    return { ok: false, reason: 'Please keep it respectful.', clean: '' };
  }
  // crude shout / spam guards
  const letters = text.replace(/[^a-z]/gi, '');
  if (letters.length >= 12 && letters === letters.toUpperCase()) {
    return { ok: false, reason: 'Please don’t use all caps.', clean: '' };
  }
  return { ok: true, clean: censor(text) };
}

// ---- Client-side rate limiter (per browser) -----------------------------

const RL_KEY = 'kumami:qa-rl';
const MIN_GAP_MS = 8_000; // min 8s between submissions
const WINDOW_MS = 60_000; // rolling window
const MAX_IN_WINDOW = 5; // max submissions per window

/** Returns { ok } and, if blocked, a reason. Records the submission on success. */
export function checkAndRecordRateLimit(now = Date.now()): { ok: boolean; reason?: string } {
  let times: number[] = [];
  try {
    times = JSON.parse(localStorage.getItem(RL_KEY) || '[]');
  } catch {
    times = [];
  }
  times = times.filter((t) => now - t < WINDOW_MS);
  if (times.length && now - times[times.length - 1] < MIN_GAP_MS) {
    const wait = Math.ceil((MIN_GAP_MS - (now - times[times.length - 1])) / 1000);
    return { ok: false, reason: `Slow down — try again in ${wait}s.` };
  }
  if (times.length >= MAX_IN_WINDOW) {
    return { ok: false, reason: 'You’ve asked a lot just now — give it a minute.' };
  }
  times.push(now);
  try {
    localStorage.setItem(RL_KEY, JSON.stringify(times));
  } catch {
    /* ignore */
  }
  return { ok: true };
}
