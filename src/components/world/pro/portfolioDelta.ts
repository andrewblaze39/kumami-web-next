/**
 * portfolioDelta — pure helpers for 24-h P&L calculations on a portfolio.
 *
 * Extracted from PortfolioTab so they can be unit-tested in isolation and
 * reused without importing any React / Firebase code.
 */

export interface PortfolioCoinDelta {
  /** Current USD value of this holding */
  value: number;
  /**
   * 24-h percentage change reported by CoinGecko.
   * Optional / nullable — CoinGecko returns null for some coins and the field
   * may be absent entirely on holdings that have never been priced.
   */
  change24h?: number | null;
}

export interface Portfolio24hDeltaResult {
  /** True when at least one holding has price data (change24h != null). */
  hasPriceData: boolean;
  /** Summed 24-h USD delta across all priced holdings.  0 when hasPriceData is false. */
  deltaValue: number;
}

/**
 * computePortfolio24hDelta
 *
 * Computes the aggregate 24-h dollar delta for a portfolio list.
 *
 * Edge-case handling:
 *  - `change24h` null or undefined  → holding excluded from delta (no price data)
 *  - `change24h <= -100`            → `prev` clamped to `item.value` (avoids
 *    division by zero or negative denominator; gives delta = 0, which is safe
 *    because a token at -100% has a current value of ~0 anyway)
 *  - empty list                     → `hasPriceData: false`
 */
export function computePortfolio24hDelta(
  items: PortfolioCoinDelta[]
): Portfolio24hDeltaResult {
  const priced = items.filter(
    (item) => item.change24h != null && item.value > 0
  );

  if (priced.length === 0) {
    return { hasPriceData: false, deltaValue: 0 };
  }

  const deltaValue = priced.reduce((sum, item) => {
    const pct = item.change24h as number;
    // Guard: pct <= -100 makes (1 + pct/100) <= 0, causing div-by-zero or
    // a negative "previous value".  Clamp prev to item.value so delta = 0.
    const prev = pct <= -100 ? item.value : item.value / (1 + pct / 100);
    return sum + (item.value - prev);
  }, 0);

  return { hasPriceData: true, deltaValue };
}
