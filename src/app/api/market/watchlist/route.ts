/**
 * /api/market/watchlist
 *
 * GET  — Returns the combined watchlist payload:
 *   {
 *     slots: number,                      // free=5, pro=Infinity (null in JSON)
 *     assets: WatchlistAsset[],           // radar watchlist (auto-detected, capped to slots)
 *     curatedSymbols: string[],           // user's curated symbol list
 *     curatedAssets: WatchlistAsset[],    // live rows for curated symbols (price/24h/tags)
 *   }
 *   The `slots` field serializes as null for Infinity (pro unlimited). UI reads
 *   `slots === null` as unlimited. curatedAssets is built directly per curated
 *   symbol (not looked up from the auto-radar's fixed list) so every symbol a
 *   user pins gets real live data, even ones outside the auto-radar's set.
 *
 * POST { symbol: string } — Add symbol to curated watchlist.
 *   Returns 200 { symbols: string[] } on success.
 *   Returns 400 { error: 'invalid_symbol' } for unknown symbol.
 *   Returns 403 { error: 'slots_exceeded' } when free-tier limit reached.
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
import { watchlistSlots } from '@/lib/market/gating';
import type { WatchlistApiResponse } from '@/lib/market/contracts';
import { buildAsset } from '@/lib/market/live/watchlist';
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

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { uid, tier } = auth;

  // Full pro-tier payload cached 300s per uid — used for both radar and
  // curated asset rows so we only call the provider once.
  const fullPayload = await getCachedFresh(
    `market:v2:watchlist:${uid}`,
    300,
    () => getProvider().watchlist(uid, 'pro'),
  );

  const slots = watchlistSlots(tier);
  const cappedAssets = Number.isFinite(slots)
    ? fullPayload.assets.slice(0, slots)
    : fullPayload.assets;

  // Curated symbols — always fresh (user edits must reflect immediately)
  const curatedSymbols = await getCuratedSymbols(uid);

  // Build a real market row per curated symbol directly (not a lookup against
  // the auto-radar's fixed 10-symbol list) — the pin allowlist (ALLOWED_SYMBOLS
  // in userWatchlist.ts) isn't identical to that list, so a lookup silently
  // dropped pinned symbols like ARB/APT that aren't in the auto-radar set.
  // buildAsset's own CoinGlass calls are cached individually, so this is cheap.
  const curatedAssets = (
    await Promise.all(curatedSymbols.map(sym => buildAsset(sym).catch(() => null)))
  ).filter((a): a is WatchlistApiResponse['curatedAssets'][number] => a !== null);

  const body: WatchlistApiResponse = {
    slots: serialiseSlots(slots),
    assets: cappedAssets,
    curatedSymbols,
    curatedAssets: curatedAssets as WatchlistApiResponse['curatedAssets'],
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

  const slots = watchlistSlots(tier);

  const result = await addSymbol(uid, symbol, slots);

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
