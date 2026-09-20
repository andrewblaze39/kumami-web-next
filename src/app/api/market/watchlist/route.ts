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
 *   Pro tier additionally reuses the shared Flow Radar event buffer (Kumami
 *   Pro §2.9, §2.8 — zero extra CoinGlass calls) to: (a) compute Whale
 *   Accumulation/Distribution tags for every Section A/B asset, and (b)
 *   score Section C candidates from whatever's left in the buffer.
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
import { watchlistSlots, pinCap } from '@/lib/market/gating';
import type { WatchlistApiResponse } from '@/lib/market/contracts';
import { buildAsset } from '@/lib/market/live/watchlist';
import { computeWhaleEventCounts, computeSectionC } from '@/lib/market/rules/watchlistSectionC';
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
  const { uid, tier } = auth;
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

  if (isPro) {
    // Pro-only: reuse the shared Flow Radar event buffer (Kumami Pro §2.9,
    // §2.8 — same cache key the flow-radar route uses, zero extra CoinGlass
    // calls) to compute Whale Accumulation/Distribution tags and Section C.
    const flowEvents = await withTimeout(
      getCachedFresh('market:v2:flow-radar', 60, () => getProvider().flowRadar('pro')),
      ENRICHMENT_TIMEOUT_MS,
    ).catch(() => null) ?? [];
    const now = Date.now();
    const events24h = flowEvents.filter((e) => now - Date.parse(e.ts) <= 24 * 3_600_000);
    const whaleCounts = computeWhaleEventCounts(events24h);

    // Re-derive Section A + B rows with whale tags folded in. buildAsset's own
    // per-endpoint CoinGlass calls are individually cached (see live/watchlist.ts),
    // so re-invoking it here is cheap — no new network calls, just a fresh tag pass.
    const [sectionARebuilt, curatedRebuilt] = await Promise.all([
      Promise.all(sectionAAssets.map((a) => buildAsset(a.asset, whaleCounts[a.asset]).catch(() => null))),
      Promise.all(curatedSymbols.map((sym) => buildAsset(sym, whaleCounts[sym]).catch(() => null))),
    ]);
    sectionAAssets = sectionARebuilt.filter((a): a is WatchlistApiResponse['assets'][number] => a !== null);
    curatedAssets = curatedRebuilt.filter((a): a is WatchlistApiResponse['curatedAssets'][number] => a !== null);

    // Section C — score whatever's left in the buffer, excluding anchors + the user's own list.
    const exclude = new Set([...sectionAAssets.map((a) => a.asset), ...curatedSymbols]);
    const scored = computeSectionC(events24h, exclude, now);
    sectionC = (
      await Promise.all(scored.map(async (s) => {
        const row = await buildAsset(s.asset, whaleCounts[s.asset]).catch(() => null);
        return row ? { ...row, reasons: s.reasons } : null;
      }))
    ).filter((r): r is WatchlistApiResponse['sectionC'][number] => r !== null);
  } else {
    // Free/Plus: build curated rows directly (not a lookup against the
    // auto-radar's fixed 5-symbol list) — the pin allowlist (ALLOWED_SYMBOLS
    // in userWatchlist.ts) isn't identical to that list, so a lookup silently
    // dropped pinned symbols like ARB/APT that aren't in the auto-radar set.
    curatedAssets = (
      await Promise.all(curatedSymbols.map((sym) => buildAsset(sym).catch(() => null)))
    ).filter((a): a is WatchlistApiResponse['curatedAssets'][number] => a !== null);
  }

  const body: WatchlistApiResponse = {
    slots: serialiseSlots(slots),
    assets: sectionAAssets,
    curatedSymbols,
    curatedAssets,
    sectionC,
    pinCap: isPro ? pinCap(tier) : null,
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
