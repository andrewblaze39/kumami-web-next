/**
 * /api/v1/me/console-assets — Console Pro "Your assets" (v1.18, Rachelle's Console Pro).
 *   GET → { assets: string[], pool: string[], chips: RegimeChip[] }
 *   PUT { assets: string[] } → same shape. Up to 5 coins from the 5 anchors plus the
 *        caller's Watchlist coins; anything else is dropped. Saved in user_prefs/{uid}.consoleAssets.
 * Chips use the Console's regime engine and Kumami Fear & Greed value: the anchors come
 * from the cached Console payload, other coins are computed and cached 2 min per coin.
 * 401 signed out · 403 pro_required · 400 invalid_assets.
 */
import { fail, handler, ok, rateLimited, readJson, requireUser } from '@/lib/api/v1';
import { NextResponse } from 'next/server';
import { isProActive } from '@/lib/pro';
import { getCachedFresh } from '@/lib/market/cache';
import { getProvider } from '@/lib/market/provider';
import { regimeChipFor } from '@/lib/market/live/console';
import { getCuratedSymbols } from '@/lib/market/userWatchlist';
import { CONSOLE_ANCHORS, consoleAssetPool, sanitizeConsoleAssets } from '@/lib/market/rules/consoleAssets';
import type { ConsolePayload } from '@/lib/market/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function proCaller(req: Request) {
  const caller = await requireUser(req);
  if (caller instanceof NextResponse) return caller;
  const { adminDb } = await import('@/lib/firebase-admin');
  const user = (await adminDb().doc(`users/${caller.uid}`).get()).data();
  if (!isProActive(user ?? null)) return fail('pro_required', 403, 'Console Pro is part of Kumami Pro.');
  return caller;
}

async function chipsFor(assets: string[]): Promise<ConsolePayload['regimeChips']> {
  // Same cache key as /api/market/console, so the anchors match the Console exactly.
  const consolePayload = await getCachedFresh('market:v2:console', 300, () => getProvider().console());
  const fg = consolePayload.marketConditions.fearGreed ?? 50;
  const anchors = new Map(consolePayload.regimeChips.map((c) => [c.asset, c]));
  return Promise.all(
    assets.map((a) =>
      anchors.get(a) ??
      getCachedFresh(`market:v1:regime-chip:${a}`, 120, () => regimeChipFor(a, fg)),
    ),
  );
}

async function respond(uid: string, assets: string[]) {
  const pool = consoleAssetPool(await getCuratedSymbols(uid));
  return ok({ assets, pool, chips: await chipsFor(assets) });
}

export const GET = handler('me/console-assets', async (req: Request) => {
  const caller = await proCaller(req);
  if (caller instanceof NextResponse) return caller;
  const { adminDb } = await import('@/lib/firebase-admin');
  const saved = (await adminDb().doc(`user_prefs/${caller.uid}`).get()).get('consoleAssets');
  const pool = consoleAssetPool(await getCuratedSymbols(caller.uid));
  return respond(caller.uid, sanitizeConsoleAssets(saved, pool) ?? CONSOLE_ANCHORS);
});

export const PUT = handler('me/console-assets/put', async (req: Request) => {
  const caller = await proCaller(req);
  if (caller instanceof NextResponse) return caller;
  if (rateLimited(`console-assets:${caller.uid}`, 30, 60_000)) return fail('rate_limited', 429, 'Too many changes — try again in a minute.');
  const body = await readJson(req);
  const pool = consoleAssetPool(await getCuratedSymbols(caller.uid));
  const assets = sanitizeConsoleAssets(body.assets, pool);
  if (!assets) return fail('invalid_assets', 400, 'Pick 1–5 coins from the anchors or your Watchlist.');
  const { adminDb } = await import('@/lib/firebase-admin');
  await adminDb().doc(`user_prefs/${caller.uid}`).set({ consoleAssets: assets }, { merge: true });
  return respond(caller.uid, assets);
});
