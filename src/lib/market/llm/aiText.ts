/**
 * Pure helpers for the AI layer (Rachelle v1.15 Platform) — prompt building and
 * output cleaning, kept free of I/O so they're unit-testable. The AI only
 * rewrites text around verdicts the rule engines already computed; it never
 * picks or changes a verdict.
 */

/** Strip quotes / markdown, collapse whitespace, cap the length, never name the data provider. */
export function cleanSentence(raw: string, maxChars = 320): string | null {
  let s = raw.replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^["“'‘]+|["”'’]+$/g, '').trim();
  if (!s || /coinglass/i.test(s)) return null;
  if (s.length > maxChars) {
    const cut = s.slice(0, maxChars);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '));
    s = end > 40 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
  }
  return s;
}

export type RegimeFacts = {
  verdict: string;
  confidence?: number;
  fearGreed: number | null;
  fearGreedLabel: string;
  etf7dUsd?: number | null;
  pctLong?: number | null;
  liq24hUsd?: number | null;
};

const usdM = (v: number) => `$${Math.round(v / 1e6)}M`;

/** Console regime sentence prompt (PM template, filled with today's facts). */
export function regimePrompt(f: RegimeFacts): string {
  const lines = [
    `Rule-engine verdict (fixed, restate it, do not change it): ${f.verdict}${f.confidence !== undefined ? ` (confidence ${f.confidence.toFixed(2)})` : ''}.`,
    f.fearGreed !== null ? `Fear & Greed: ${f.fearGreed} (${f.fearGreedLabel}).` : '',
    f.etf7dUsd != null ? `BTC ETF net flow, last 7 days: ${f.etf7dUsd >= 0 ? '+' : '−'}${usdM(Math.abs(f.etf7dUsd))}.` : '',
    f.pctLong != null ? `Accounts long: ${Math.round(f.pctLong)}%.` : '',
    f.liq24hUsd != null ? `Liquidations, last 24h: ${usdM(f.liq24hUsd)}.` : '',
  ].filter(Boolean);
  return [
    'You write one line for a crypto market dashboard.',
    ...lines,
    'Write 2 short sentences: what the market structure looks like right now and what it implies for the near term.',
    'No hedging words (could, might). No advice to buy or sell. No numbers that are not given above. Plain English.',
  ].join('\n');
}

/** Template fallback when the AI is unavailable — always true to the computed verdict. */
export function regimeFallback(f: RegimeFacts): string {
  const mood = f.fearGreed === null ? '' : ` with sentiment at ${f.fearGreed} (${f.fearGreedLabel})`;
  return `The rule engine reads the market as ${f.verdict}${mood}.`;
}

export type FlowVerdictFacts = {
  window: string;
  verdict: string;
  statLine: string;
  /** Biggest events in the window, e.g. "BTC Long Flush $62M". */
  top: string[];
};

/** Flow Radar verdict-band sentence prompt (v1.15 Plus §3: AI sentence under the band). */
export function flowVerdictPrompt(f: FlowVerdictFacts): string {
  return [
    'You write one line under the verdict of a crypto money-flow radar.',
    `Window: last ${f.window}.`,
    `Rule-engine verdict (fixed, restate it, do not change it): ${f.verdict}.`,
    `Summary: ${f.statLine}.`,
    f.top.length ? `Biggest events: ${f.top.join('; ')}.` : 'No large events.',
    'Write 1–2 short sentences: what this flow says and what to watch next. Name at most one coin: the one in the biggest event.',
    'Say "large wallets" or "traders"; never claim they are institutions or retail. Do not repeat the verdict name or the summary line word for word.',
    'No hedging words (could, might). No advice to buy or sell. No numbers that are not given above. Plain English.',
  ].join('\n');
}

export type Tone = 'bullish' | 'bearish' | 'neutral';

/** Headline classification prompt for Fear & Greed News Tone. */
export function newsTonePrompt(headlines: string[]): string {
  return [
    'Classify each crypto news headline as bullish, bearish or neutral for crypto prices.',
    'Answer with a JSON array of strings only, one per headline, in order. Example: ["bullish","neutral"]',
    ...headlines.map((h, i) => `${i + 1}. ${h.replace(/\s+/g, ' ').slice(0, 200)}`),
  ].join('\n');
}

/** Parse the model's JSON array; null unless it is exactly one valid label per headline. */
export function parseTones(raw: string, count: number): Tone[] | null {
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr) || arr.length !== count) return null;
    const tones = arr.map((x) => String(x).toLowerCase().trim());
    return tones.every((t) => t === 'bullish' || t === 'bearish' || t === 'neutral') ? (tones as Tone[]) : null;
  } catch {
    return null;
  }
}
