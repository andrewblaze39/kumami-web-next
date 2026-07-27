/**
 * CoinGlass v4 API client (server-side only).
 *
 * - Base origin: https://open-api-v4.coinglass.com — documented endpoint paths
 *   already start with `/api/...`, so we join origin + path.
 * - Auth: `CG-API-KEY` request header. The key lives in COINGLASS_API_KEY and is
 *   NEVER exposed to the client bundle (this module must only run in route
 *   handlers / server components).
 * - Envelope: v4 responses are `{ code, msg, data }`; `code === "0"` means success.
 *
 * Per-endpoint TTL caching goes through the shared market cache (getCached),
 * so Console / On-Chain / Watchlist etc. that read overlapping endpoints share
 * one cached result instead of each making its own call.
 */

import { getCached } from '../cache';

const CG_ORIGIN = 'https://open-api-v4.coinglass.com';

/** True when a CoinGlass key is configured — lets the live provider fall back to mock cleanly. */
export function coinglassConfigured(): boolean {
  return typeof process.env.COINGLASS_API_KEY === 'string' && process.env.COINGLASS_API_KEY.length > 0;
}

type CgParams = Record<string, string | number | boolean | undefined>;

interface CgEnvelope<T> {
  code?: string | number;
  msg?: string;
  data?: T;
}

/**
 * Fetch a CoinGlass v4 endpoint and return its `data` payload.
 * @param path documented endpoint path, e.g. `/api/futures/coins-markets`
 */
export async function cgFetch<T>(path: string, params?: CgParams): Promise<T> {
  const key = process.env.COINGLASS_API_KEY;
  if (!key) throw new Error('COINGLASS_API_KEY is not set');

  const url = new URL(CG_ORIGIN + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { 'CG-API-KEY': key, accept: 'application/json' },
    cache: 'no-store', // we manage freshness via our own TTL cache
  });

  if (!res.ok) {
    throw new Error(`CoinGlass ${path} → HTTP ${res.status}`);
  }

  const body = (await res.json()) as CgEnvelope<T>;
  // v4 success sentinel is code "0"; tolerate number or string.
  if (body.code !== undefined && String(body.code) !== '0') {
    throw new Error(`CoinGlass ${path} → error ${body.code}: ${body.msg ?? 'unknown'}`);
  }
  return body.data as T;
}

/**
 * Cached CoinGlass fetch — share one result across every panel that reads this
 * endpoint. `cacheKey` should be stable per (endpoint + params); `ttlSec` per
 * the refresh cadence documented for the endpoint.
 */
export function cgCached<T>(
  cacheKey: string,
  ttlSec: number,
  path: string,
  params?: CgParams,
): Promise<T> {
  return getCached<T>(cacheKey, ttlSec, () => cgFetch<T>(path, params));
}
