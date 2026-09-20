import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getWalletSummary, sdkForChain } from '@/lib/alchemy';
import {
  TokenBalanceType, AssetTransfersCategory, SortingOrder,
  type AssetTransfersWithMetadataResponse, type TokenBalancesResponse,
} from 'alchemy-sdk';

/**
 * GET /api/wallet-profile?address=0x...
 *
 * Crypto Address Tracker (Kumami Pro §4) — a richer, standalone reading of a
 * wallet than the existing basic tracker in Kuma AI Chat (/api/wallet-data).
 * Same Alchemy-backed data source, no new paid vendor.
 *
 * Built (real, computed from live on-chain + price data):
 *   - portfolioValueUsd, holdings (value + % of portfolio), sorted descending
 *   - "Whale" behavioral tag (portfolio >= $10M) — the only tag implemented;
 *     "Trader"/"Farmer" need >90-day tx-pattern data this endpoint doesn't
 *     fetch (§4.1's own thresholds are explicitly unvalidated placeholders
 *     anyway — shipping an unvalidated guess would be worse than no tag)
 *   - transactions (recent tx count, both directions) + firstSeen (earliest
 *     transfer touching the address, either direction)
 *   - Recent activity: real transfers with direction, asset, amount,
 *     counterparty address, and a block explorer link
 *
 * Explicitly NOT built (documented gaps, not faked):
 *   - Realised PnL / win rate (§4.2) — needs full historical buy/sell
 *     reconstruction (FIFO or otherwise); returns null, UI shows "—"
 *   - "Net outflow from exchanges" / "Deposit to exchange" style labels
 *     (§4.5, §4.6) — both need a verified CEX hot-wallet address list to
 *     classify a counterparty as an exchange. Hand-typing addresses from
 *     memory risks silently mislabeling real activity (wrong address = wrong
 *     classification, worse than no classification) — this needs a proper
 *     verified source (e.g. Etherscan's public label API) wired in, not
 *     guessed. Recent activity below shows the plain in/out + counterparty
 *     instead of guessing exchange vs. cold-wallet.
 *   - "Consistent accumulator" flag (§4.5) — needs 6-month price-drawdown
 *     correlation, a separate background computation this endpoint doesn't do
 *   - "No contract interactions flagged" (§4.5) — needs a GoPlus Security API
 *     integration that doesn't exist anywhere in this codebase yet (Security
 *     Scanner, which would own it, is itself an unbuilt placeholder tab)
 *   - "Kumami AI Read" narrative (§4.3) — needs an LLM call; no LLM key is
 *     wired into this app anywhere yet (same gap as Console/Flow Radar's
 *     hardcoded-template sentences)
 *   - Linked wallets (§4.7) — needs the separate wallet-clustering heuristics
 *     spec'd elsewhere; not implemented
 */

const WHALE_THRESHOLD_USD = 10_000_000;

// Each Alchemy call below is independently best-effort: a slow/unhealthy
// upstream (the SDK's own retry logic can otherwise take 60-80s per call)
// degrades that one piece of the profile rather than 500ing the whole page.
// Same defensive pattern this codebase already uses everywhere CoinGlass is
// called (getCachedFresh's stale-value fallback, per-panel try/catch, etc.).
const CALL_TIMEOUT_MS = 8_000;
const EMPTY_TRANSFERS: AssetTransfersWithMetadataResponse = { transfers: [] };
const EMPTY_TOKEN_BALANCES: TokenBalancesResponse = { address: '', tokenBalances: [] };
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]).catch(() => fallback);
}

function formatTokenBalance(rawHex: string, decimals: number): string {
  const raw = BigInt(rawHex);
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = raw / divisor;
  const remainder = raw % divisor;
  const fracStr = remainder.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${fracStr}`;
}

type PricedHolding = { symbol: string; amount: number; valueUsd: number | null };

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  try {
    await adminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: 'invalid address' }, { status: 400 });
  }

  try {
    const eth = sdkForChain('eth');

    const [summary, tokenResult, outgoing, incoming, firstOut, firstIn] = await Promise.all([
      withTimeout(getWalletSummary(address, ['eth', 'base', 'arb']), CALL_TIMEOUT_MS, []),
      withTimeout(eth.core.getTokenBalances(address, { type: TokenBalanceType.DEFAULT_TOKENS }), CALL_TIMEOUT_MS, EMPTY_TOKEN_BALANCES),
      withTimeout(eth.core.getAssetTransfers({
        fromAddress: address,
        category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
        order: SortingOrder.DESCENDING,
        maxCount: 10,
        withMetadata: true,
      }), CALL_TIMEOUT_MS, EMPTY_TRANSFERS),
      withTimeout(eth.core.getAssetTransfers({
        toAddress: address,
        category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
        order: SortingOrder.DESCENDING,
        maxCount: 10,
        withMetadata: true,
      }), CALL_TIMEOUT_MS, EMPTY_TRANSFERS),
      withTimeout(eth.core.getAssetTransfers({
        fromAddress: address,
        category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
        order: SortingOrder.ASCENDING,
        maxCount: 1,
        withMetadata: true,
      }), CALL_TIMEOUT_MS, EMPTY_TRANSFERS),
      withTimeout(eth.core.getAssetTransfers({
        toAddress: address,
        category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
        order: SortingOrder.ASCENDING,
        maxCount: 1,
        withMetadata: true,
      }), CALL_TIMEOUT_MS, EMPTY_TRANSFERS),
    ]);

    // --- Holdings (ETH-chain top tokens, priced against CoinGecko's top-100) ---
    const nonZero = (tokenResult.tokenBalances ?? []).filter(
      (t) => t.tokenBalance && BigInt(t.tokenBalance) !== BigInt(0),
    ).slice(0, 10);
    const metadataResults = await Promise.allSettled(
      nonZero.map((t) => withTimeout(eth.core.getTokenMetadata(t.contractAddress), CALL_TIMEOUT_MS, null)),
    );
    const rawHoldings = nonZero.map((t, i) => {
      const meta = metadataResults[i].status === 'fulfilled' ? metadataResults[i].value : null;
      const symbol = meta?.symbol ?? t.contractAddress.slice(0, 6);
      const decimals = meta?.decimals ?? 18;
      const amount = Number(formatTokenBalance(t.tokenBalance ?? '0x0', decimals));
      return { symbol: symbol.toUpperCase(), amount };
    });

    const ethRow = summary.find((s) => s.chain === 'eth');
    const ethAmount = ethRow ? parseFloat(ethRow.ethBalance) : 0;

    const symbols = Array.from(new Set(['ETH', ...rawHoldings.map((h) => h.symbol)]));
    const priceMap: Record<string, number> = {};
    try {
      const res = await fetch(`${req.nextUrl.origin}/api/coingecko/markets?per_page=100&page=1`);
      if (res.ok) {
        const data: { symbol: string; current_price: number }[] = await res.json();
        for (const coin of data) {
          if (symbols.includes(coin.symbol.toUpperCase())) {
            priceMap[coin.symbol.toUpperCase()] = coin.current_price;
          }
        }
      }
    } catch { /* pricing is best-effort — unpriced holdings show as null below */ }

    const holdings: PricedHolding[] = [
      { symbol: 'ETH', amount: ethAmount, valueUsd: priceMap.ETH != null ? ethAmount * priceMap.ETH : null },
      ...rawHoldings.map((h) => ({
        symbol: h.symbol,
        amount: h.amount,
        valueUsd: priceMap[h.symbol] != null ? h.amount * priceMap[h.symbol] : null,
      })),
    ].sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1));

    const portfolioValueUsd = holdings.reduce((sum, h) => sum + (h.valueUsd ?? 0), 0);
    const holdingsWithPct = holdings.map((h) => ({
      ...h,
      pctOfPortfolio: portfolioValueUsd > 0 && h.valueUsd != null ? (h.valueUsd / portfolioValueUsd) * 100 : null,
    }));

    // --- Behavioral tag ---
    const tag = portfolioValueUsd >= WHALE_THRESHOLD_USD ? 'Whale' : null;

    // --- Stats ---
    const transactions = summary.reduce((sum, s) => sum + s.recentTxCount, 0);
    const firstSeenCandidates = [
      firstOut.transfers[0]?.metadata?.blockTimestamp,
      firstIn.transfers[0]?.metadata?.blockTimestamp,
    ].filter((d): d is string => Boolean(d));
    const firstSeen = firstSeenCandidates.length ? firstSeenCandidates.sort()[0] : null;

    // --- Recent activity — real direction/asset/counterparty, no exchange
    // guessing (see file header: needs a verified CEX address source first).
    const merged = [
      ...outgoing.transfers.map((t) => ({ ...t, direction: 'out' as const })),
      ...incoming.transfers.map((t) => ({ ...t, direction: 'in' as const })),
    ]
      .sort((a, b) => (b.metadata?.blockTimestamp ?? '').localeCompare(a.metadata?.blockTimestamp ?? ''))
      .slice(0, 10);

    const recentActivity = merged.map((t) => ({
      direction: t.direction,
      asset: t.asset ?? 'ETH',
      value: t.value ?? null,
      counterparty: t.direction === 'out' ? t.to : t.from,
      ts: t.metadata?.blockTimestamp ?? null,
      hash: t.hash,
    }));

    return NextResponse.json({
      address,
      portfolioValueUsd,
      tag,
      holdings: holdingsWithPct,
      stats: { transactions, firstSeen, realisedPnlUsd: null, winRatePct: null },
      recentActivity,
      summary,
    });
  } catch (err) {
    console.error('[wallet-profile]', err);
    return NextResponse.json({ error: 'Failed to fetch wallet profile' }, { status: 500 });
  }
}
