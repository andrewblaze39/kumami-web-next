export type LivePrice = {
  symbol: string;
  price: number;
  change24h: number;
  /** Local receipt time of the Binance tick, in Unix milliseconds. */
  updatedAt: number;
};

export type LivePriceFreshness = 'live' | 'stale' | 'unavailable';

/**
 * Parse Binance's combined-stream `miniTicker` payload. A tick is rejected rather
 * than converted to a false $0 / 0% reading when any required value is absent.
 */
export function parseMiniTicker(message: unknown, updatedAt = Date.now()): LivePrice | null {
  if (!message || typeof message !== 'object') return null;
  const data = (message as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const { s, c, o } = data as { s?: unknown; c?: unknown; o?: unknown };
  if (typeof s !== 'string' || !s.endsWith('USDT')) return null;
  const symbol = s.slice(0, -'USDT'.length);
  const price = Number(c);
  const open24h = Number(o);
  if (!symbol || !Number.isFinite(price) || !Number.isFinite(open24h) || open24h <= 0) return null;
  const change24h = ((price - open24h) / open24h) * 100;
  return { symbol, price, change24h, updatedAt };
}

/** Preserve every verified prior tick while updating only the symbol that moved. */
export function mergeLivePrice(prices: Record<string, LivePrice>, tick: LivePrice): Record<string, LivePrice> {
  const prior = prices[tick.symbol];
  if (prior && prior.price === tick.price && prior.change24h === tick.change24h && prior.updatedAt === tick.updatedAt) return prices;
  return { ...prices, [tick.symbol]: tick };
}

/** A browser price tick is no longer live after six seconds without a replacement. */
export function priceFreshness(updatedAt: number | undefined, now = Date.now()): LivePriceFreshness {
  if (updatedAt === undefined) return 'unavailable';
  return now - updatedAt <= 6_000 ? 'live' : 'stale';
}
