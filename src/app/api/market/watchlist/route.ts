/**
 * /api/market/watchlist
 *
 * GET  — Returns the combined watchlist payload:
 *   {
 *     slots: number,                      // free=5, pro=Infinity (null in JSON)
 *     assets: WatchlistAsset[],           // radar watchlist (auto-detected, capped to slots)
 *     curatedSymbols: string[],           // user's curated symbol list ("Section B")
 *     curatedAssets: WatchlistAsset[],    // live rows for curated symbols (price/24h/tags)
 *     sectionC: WatchlistAsset[],         // Pro-only "Also Worth Watching" (empty on free/plus)
 *     pinCap: number | null,              // Pro-only pin cap (15); null on free
 *   }
 *   The `slots` field serializes as null for Infinity (pro unlimited). UI reads
 *   `slots === null` as unlimited. curatedAssets is built directly per curated
 *   symbol (not looked up from the auto-radar's fixed list) so every symbol a
 *   user pins gets real live data, even ones outside the auto-radar's set.
 *
 *   Every tier's rows carry two independent tag concepts: `actionTags`
 *   (Status column — up to 2 risk/positioning/regime tags) and
 *   `primarySignal` (Signal column — a dedicated whale/smart-money/Spot
 *   Pulse narrative, never counted toward the Status 2-tag cap). Both reuse
 *   the shared Flow Radar event buffer and a cached Spot Pulse read (zero
 *   extra CoinGlass calls beyond what those tabs already fetch). Pro tier
 *   additionally scores Section C candidates from whatever's left in the buffer.
 *
 * POST { symbol: string } — Add symbol to curated watchlist ("Section B").
 *   Returns 200 { symbols: string[] } on success.
 *   Returns 400 { error: 'invalid_symbol' } for unknown symbol.
 *   Returns 403 { error: 'slots_exceeded' } at the tier's pin cap (§2.7 — 15 on Pro, 0 on free).
 *
 * DELETE { symbol: string } — Remove symbol from curated watchlist.
 *   Returns 200 { symbols: string[] }.
 *
 * Cache: GET cached 300s per uid (radar payload); curated symbols are fetched
 * fresh each time (no cache — user edits must reflect immediately).
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCachedFresh } from '@/lib/market/cache';
import { watchlistSlots, pinCap, effectiveTier, parseView } from '@/lib/market/gating';
import { pickExtraCoins } from '@/lib/market/consistentCoins';
import type { WatchlistApiResponse } from '@/lib/market/contracts';
import { buildAsset, type SignalInputs } from '@/lib/market/live/watchlist';
import {
  computeWhaleEventCounts, computeWhaleEventUsd, computeSmartMoneyCounts,
} from '@/lib/market/rules/watchlistSectionC';
import {
  getCuratedSymbols,
  addSymbol,
  removeSymbol,
} from '@/lib/market/userWatchlist';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Infinity can't be JSON-serialised; normalise to null for the wire format.
// The UI checks `slots === null` as "unlimited".
function serialiseSlots(s: number): number | null {
  return Number.isFinite(s) ? s : null;
}

// The Flow Radar event buffer here only feeds enrichment (Whale Accumulation/
// Distribution tags + Section C) — never the core Section A/B rows. Bound it
// so a slow/unhealthy CoinGlass can't stall the whole response (same reason
// as flow-radar/route.ts's cross-signal timeout).
const ENRICHMENT_TIMEOUT_MS = 4_000;
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;
  // Watchlist Plus (?view=plus — every account) vs Watchlist Pro (?view=pro AND a Pro account).
  const tier = effectiveTier(parseView(request.url), auth.tier);
  const isPro = tier === 'pro';

  // Full tier-agnostic payload cached 300s per uid — base rows for Section A.
  const fullPayload = await getCachedFresh(
    `market:v2:watchlist:${uid}`,
    300,
    () => getProvider().watchlist(uid, 'pro'),
  );

  const slots = watchlistSlots(tier);
  let sectionAAssets = Number.isFinite(slots)
    ? fullPayload.assets.slice(0, slots)
    : fullPayload.assets;

  // Curated symbols ("Section B") — always fresh (user edits must reflect immediately)
  const curatedSymbols = await getCuratedSymbols(uid);

  let curatedAssets: WatchlistApiResponse['curatedAssets'] = [];
  let sectionC: WatchlistApiResponse['sectionC'] = [];
  let sectionCMode: WatchlistApiResponse['sectionCMode'];
  let historyDays: number | undefined;

  // Signal column inputs (Kumami Plus — shared across tiers, not Pro-exclusive):
  // whale flow + smart money both come from the shared Flow Radar event
  // buffer (zero extra CoinGlass calls); Spot Pulse verdict is its own cached
  // read, used only as a fallback when no whale/smart-money signal fired.
  // Each fetch is independently timeout-guarded so a slow upstream degrades
  // that one signal rather than the page.
  const [flowEvents, spotPulse] = await Promise.all([
    withTimeout(
      getCachedFresh('market:v2:flow-radar', 60, () => getProvider().flowRadar('pro')),
      ENRICHMENT_TIMEOUT_MS,
    ).catch(() => null),
    withTimeout(
      getCachedFresh('market:v2:spot-pulse:pro:4H', 60, () => getProvider().spotPulse('pro', '4H')),
      ENRICHMENT_TIMEOUT_MS,
    ).catch(() => null),
  ]);
  const events = flowEvents ?? [];
  const now = Date.now();
  const events24h = events.filter((e) => now - Date.parse(e.ts) <= 24 * 3_600_000);
  const whaleCounts = computeWhaleEventCounts(events24h);
  const whaleUsd = computeWhaleEventUsd(events24h);
  const smartMoneyCounts = computeSmartMoneyCounts(events24h);
  const spotPulseByAsset = new Map((spotPulse?.tiles ?? []).map((t) => [t.asset, t]));

  function signalInputsFor(asset: string): SignalInputs {
    const tile = spotPulseByAsset.get(asset);
    return {
      whale: { ...(whaleCounts[asset] ?? { bullish: 0, bearish: 0 }), ...(whaleUsd[asset] ?? { bullishUsd: 0, bearishUsd: 0 }) },
      smartMoney: smartMoneyCounts[asset],
      spotPulse: tile && !tile.insufficient ? { verdict: tile.verdict, priceChange4h: tile.priceChange4h } : undefined,
    };
  }

  // Re-derive Section A with Signal + Status tags folded in for every tier.
  // buildAsset's own per-endpoint CoinGlass calls are individually cached
  // (see live/watchlist.ts), so re-invoking it here is cheap — no new
  // network calls, just a fresh tag pass.
  const sectionARebuilt = await Promise.all(
    sectionAAssets.map((a) => buildAsset(a.asset, signalInputsFor(a.asset)).catch(() => null)),
  );
  sectionAAssets = sectionARebuilt.filter((a): a is WatchlistApiResponse['assets'][number] => a !== null);

  if (isPro) {
    // Pro-only: Section B (custom list) also gets Signal/Status tags, plus
    // Section C ("Also Worth Watching") is scored from whatever's left in the buffer.
    curatedAssets = (
      await Promise.all(curatedSymbols.map((sym) => buildAsset(sym, signalInputsFor(sym)).catch(() => null)))
    ).filter((a): a is WatchlistApiResponse['curatedAssets'][number] => a !== null);

    // Section C (Andrew's spec v1.6 ← Rachelle: "5 fixed + 5 consistent spikes"):
    // the coins most consistently present in Flow Radar over the last 7 days.
    // Until 7 days of history exist, fall back to the 24h whale-flow scoring.
    const exclude = new Set([...sectionAAssets.map((a) => a.asset), ...curatedSymbols]);
    const extras = await pickExtraCoins(events, exclude, now);
    historyDays = extras.historyDays;
    sectionCMode = extras.mode;
    const scored = extras.coins;
    sectionC = (
      await Promise.all(scored.map(async (s) => {
        const row = await buildAsset(s.asset, signalInputsFor(s.asset)).catch(() => null);
        return row ? { ...row, reasons: s.reasons } : null;
      }))
    ).filter((r): r is WatchlistApiResponse['sectionC'][number] => r !== null);
  }
  // Watchlist Plus: the 5 fixed coins only — no custom coins, no Section C
  // (Andrew's spec v1.6), even for Pro accounts viewing the Plus page.

  const body: WatchlistApiResponse = {
    slots: serialiseSlots(slots),
    assets: sectionAAssets,
    curatedSymbols,
    curatedAssets,
    sectionC,
    pinCap: isPro ? pinCap(tier) : null,
    ...(isPro ? { sectionCMode, historyDays } : {}),
  };

  return NextResponse.json(body);
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { uid, tier } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const symbol = typeof (body as Record<string, unknown>)?.symbol === 'string'
    ? ((body as Record<string, unknown>).symbol as string).toUpperCase().trim()
    : '';

  const cap = pinCap(tier);

  const result = await addSymbol(uid, symbol, cap);

  if ('code' in result) {
    const status = result.code === 'slots_exceeded' ? 403 : 400;
    return NextResponse.json({ error: result.code }, { status });
  }

  return NextResponse.json({ symbols: result });
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const symbol = typeof (body as Record<string, unknown>)?.symbol === 'string'
    ? ((body as Record<string, unknown>).symbol as string).toUpperCase().trim()
    : '';

  const updated = await removeSymbol(uid, symbol);
  return NextResponse.json({ symbols: updated });
}
