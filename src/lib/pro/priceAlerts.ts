/**
 * Price alerts, CoinMarketCap-style (v1.18 point 5, Andrew 29 Oct 2026). Pure logic shared by
 * the API (/api/v1/me/alerts), the collector's server-side check (lib/pro/alertRunner) and the
 * Following & Alerts page.
 *
 * Kinds (CMC's "price reaches" / "% change" / volume alerts):
 *   price_above  · price rises above $X          price_below · price drops below $X
 *   pct_up_24h   · up X% in 24h                  pct_down_24h · down X% in 24h
 *   volume_up    · 24h volume up X% vs when the alert armed
 *   move_pct     · legacy (pre-v1.18 "price changes by X%"): a move either way from the armed price
 * Frequency: "once" pauses the alert after it fires; "every" fires each time the condition is met
 * again after it has cleared.
 *
 * Arming: an alert only fires on a crossing. If the condition is already true when it is
 * created, it waits until the condition is false once (no instant alert for "BTC above $1").
 */

export type AlertKind = 'price_above' | 'price_below' | 'pct_up_24h' | 'pct_down_24h' | 'volume_up' | 'move_pct';
export type AlertFrequency = 'once' | 'every';

export type AlertDef = {
  id: number;
  /** Base coin symbol, e.g. "BTC" (priced against USDT). */
  symbol: string;
  kind: AlertKind;
  /** USD target (price_above / price_below) or a percentage (the others). */
  value: number;
  frequency: AlertFrequency;
  /** false = paused. */
  on: boolean;
};

/** Server-kept state per alert (price_alerts/{uid}.state[id]). */
export type AlertState = {
  armed: boolean;
  /** move_pct: price it armed at · volume_up: 24h volume it armed at. */
  baseline?: number;
  lastTriggeredAt?: number;
  lastValue?: number;
  count?: number;
};

export type Ticker = { price: number; change24hPct: number; quoteVolume24h: number };

export const MAX_ALERTS = 50;

/** The kinds offered in the alert builder (move_pct is only kept for old alerts). */
export const ALERT_KINDS: { kind: Exclude<AlertKind, 'move_pct'>; label: string; unit: '$' | '%' }[] = [
  { kind: 'price_above', label: 'Price rises above', unit: '$' },
  { kind: 'price_below', label: 'Price drops below', unit: '$' },
  { kind: 'pct_up_24h', label: 'Price is up (24h)', unit: '%' },
  { kind: 'pct_down_24h', label: 'Price is down (24h)', unit: '%' },
  { kind: 'volume_up', label: '24h volume up', unit: '%' },
];
const KINDS = new Set<AlertKind>(['price_above', 'price_below', 'pct_up_24h', 'pct_down_24h', 'volume_up', 'move_pct']);

export function fmtUsd(v: number): string {
  if (v >= 1) return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return '$' + String(Number(v.toPrecision(4)));
}
function fmtCompactUsd(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

export function alertLabel(d: Pick<AlertDef, 'symbol' | 'kind' | 'value'>): string {
  switch (d.kind) {
    case 'price_above': return `${d.symbol} price rises above ${fmtUsd(d.value)}`;
    case 'price_below': return `${d.symbol} price drops below ${fmtUsd(d.value)}`;
    case 'pct_up_24h': return `${d.symbol} up ${d.value}% in 24h`;
    case 'pct_down_24h': return `${d.symbol} down ${d.value}% in 24h`;
    case 'volume_up': return `${d.symbol} 24h volume up ${d.value}%`;
    case 'move_pct': return `${d.symbol} moves ${d.value}% either way`;
  }
}

function conditionMet(d: AlertDef, t: Ticker, baseline: number | undefined): boolean {
  switch (d.kind) {
    case 'price_above': return t.price > d.value;
    case 'price_below': return t.price < d.value;
    case 'pct_up_24h': return t.change24hPct >= d.value;
    case 'pct_down_24h': return t.change24hPct <= -d.value;
    case 'volume_up': return !!baseline && ((t.quoteVolume24h - baseline) / baseline) * 100 >= d.value;
    case 'move_pct': return !!baseline && Math.abs(((t.price - baseline) / baseline) * 100) >= d.value;
  }
}

function message(d: AlertDef, t: Ticker, baseline: number | undefined): string {
  const now = fmtUsd(t.price);
  switch (d.kind) {
    case 'price_above': return `${d.symbol} rose above ${fmtUsd(d.value)} — now ${now}`;
    case 'price_below': return `${d.symbol} dropped below ${fmtUsd(d.value)} — now ${now}`;
    case 'pct_up_24h': return `${d.symbol} is up ${t.change24hPct.toFixed(1)}% in 24h — now ${now}`;
    case 'pct_down_24h': return `${d.symbol} is down ${Math.abs(t.change24hPct).toFixed(1)}% in 24h — now ${now}`;
    case 'volume_up': {
      const pct = baseline ? ((t.quoteVolume24h - baseline) / baseline) * 100 : 0;
      return `${d.symbol} 24h volume is up ${Math.round(pct)}% — ${fmtCompactUsd(t.quoteVolume24h)}`;
    }
    case 'move_pct': {
      const pct = baseline ? ((t.price - baseline) / baseline) * 100 : 0;
      return `${d.symbol} moved ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% since the alert armed — now ${now}`;
    }
  }
}

/**
 * One check of one alert against the latest ticker. Returns the next state, the trigger (if it
 * fired) and whether to pause it (frequency "once"). A paused alert or a missing price changes nothing.
 */
export function evaluateAlert(
  d: AlertDef,
  prev: AlertState | undefined,
  t: Ticker | null,
  now: number,
): { state: AlertState; trigger: { message: string; value: number } | null; pause: boolean } {
  if (!d.on || !t) return { state: prev ?? { armed: true }, trigger: null, pause: false };
  let state: AlertState = prev ?? {
    armed: true,
    ...(d.kind === 'volume_up' ? { baseline: t.quoteVolume24h } : d.kind === 'move_pct' ? { baseline: t.price } : {}),
  };
  const met = conditionMet(d, t, state.baseline);
  if (!prev) return { state: { ...state, armed: !met }, trigger: null, pause: false };
  if (state.armed && met) {
    const trigger = { message: message(d, t, state.baseline), value: t.price };
    state = {
      ...state,
      armed: false,
      lastTriggeredAt: now,
      lastValue: t.price,
      count: (state.count ?? 0) + 1,
      // A "moves X% either way" alert re-arms from the new price, like the old Re-arm button.
      ...(d.kind === 'move_pct' && d.frequency === 'every' ? { armed: true, baseline: t.price } : {}),
    };
    return { state, trigger, pause: d.frequency === 'once' };
  }
  if (!state.armed && !met) state = { ...state, armed: true };
  return { state, trigger: null, pause: false };
}

/** Validate alerts sent by the client (unknown shape) — invalid ones are dropped, never repaired into something else. */
export function normalizeAlerts(input: unknown): AlertDef[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<number>();
  const out: AlertDef[] = [];
  for (const raw of input) {
    if (out.length >= MAX_ALERTS) break;
    const a = raw as Record<string, unknown>;
    const id = Number(a?.id);
    const symbol = String(a?.symbol ?? '').trim().toUpperCase();
    const kind = a?.kind as AlertKind;
    const value = Number(a?.value);
    if (!Number.isFinite(id) || seen.has(id) || !/^[A-Z0-9]{2,12}$/.test(symbol) || !KINDS.has(kind) || !Number.isFinite(value) || value <= 0) continue;
    seen.add(id);
    out.push({ id, symbol, kind, value, frequency: a.frequency === 'every' ? 'every' : 'once', on: typeof a.on === 'boolean' ? a.on : true });
  }
  return out;
}

/** An alert saved before v1.18 (users/{uid}/pro/state.alerts). Sentiment alerts have no data source → null. */
export type LegacyAlert = { id: number; label: string; on: boolean; subject?: string; trigger?: string; threshold?: number };
export function fromLegacyAlert(a: LegacyAlert): AlertDef | null {
  const symbol = (a.subject ?? a.label.match(/^(\S+)/)?.[1] ?? '').toUpperCase();
  const trigger = a.trigger ?? (/volume/i.test(a.label) ? 'volume' : /sentiment/i.test(a.label) ? 'sentiment' : 'price');
  const value = a.threshold ?? Number(a.label.match(/([\d.]+)\s*%/)?.[1] ?? NaN);
  if (trigger === 'sentiment' || !/^[A-Z0-9]{2,12}$/.test(symbol) || !(value > 0)) return null;
  return { id: a.id, symbol, kind: trigger === 'volume' ? 'volume_up' : 'move_pct', value, frequency: 'every', on: a.on };
}

/** Binance 24h MINI ticker rows → Ticker per base coin (USDT pairs; change from the 24h open). */
export type BinanceMiniRow = { symbol: string; openPrice?: string | number; lastPrice?: string | number; quoteVolume?: string | number };
export function tickersFromBinance(rows: BinanceMiniRow[]): Record<string, Ticker> {
  const out: Record<string, Ticker> = {};
  for (const r of rows) {
    if (!r.symbol?.endsWith('USDT')) continue;
    const open = Number(r.openPrice), price = Number(r.lastPrice), vol = Number(r.quoteVolume ?? 0);
    if (!(open > 0) || !(price > 0) || !Number.isFinite(vol)) continue;
    out[r.symbol.slice(0, -4)] = { price, change24hPct: ((price - open) / open) * 100, quoteVolume24h: vol };
  }
  return out;
}
