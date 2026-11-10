/**
 * Console Pro "Your assets" (Rachelle's v1.18 Console Pro): the regime chips a Pro
 * user picks — up to 5 coins from the 5 anchors plus their own Watchlist coins.
 * Basic's Console always shows the 5 anchors.
 */

export const CONSOLE_ANCHORS = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];
export const MAX_CONSOLE_ASSETS = 5;

/** Coins a user may pick: the anchors, then their Watchlist coins (no duplicates, upper case). */
export function consoleAssetPool(curated: string[]): string[] {
  return [...new Set([...CONSOLE_ANCHORS, ...curated.map((s) => s.toUpperCase())])];
}

/**
 * Validate a saved or submitted selection against the pool: keeps known coins in
 * the given order, drops duplicates and anything outside the pool, caps at 5.
 * Returns null when nothing valid is left (the caller falls back to the anchors).
 */
export function sanitizeConsoleAssets(raw: unknown, pool: string[]): string[] | null {
  if (!Array.isArray(raw)) return null;
  const allowed = new Set(pool);
  const picked: string[] = [];
  for (const v of raw) {
    const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
    if (allowed.has(s) && !picked.includes(s)) picked.push(s);
    if (picked.length === MAX_CONSOLE_ASSETS) break;
  }
  return picked.length > 0 ? picked : null;
}
