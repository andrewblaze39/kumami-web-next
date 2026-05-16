import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getWalletSummary, sdkForChain } from '@/lib/alchemy';
import { TokenBalanceType } from 'alchemy-sdk';

/**
 * Converts a raw hex token balance to a human-readable decimal string using
 * BigInt arithmetic throughout, avoiding Number() precision loss for large values.
 */
function formatTokenBalance(rawHex: string, decimals: number): string {
  const raw = BigInt(rawHex);
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const remainder = raw % divisor;
  const fracStr = remainder.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${fracStr}`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  // Use slice(7) instead of replace() to avoid stripping a mid-string "Bearer "
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
    // Both calls run in parallel. Note: getWalletSummary also fetches token
    // balances internally (for topTokens / raw hex display). The explicit
    // getTokenBalances call here is intentional — it drives the separate
    // "holdings" view with formatted decimals and metadata. The duplication is
    // acceptable given the two calls serve distinct purposes.
    const [summary, tokenResult] = await Promise.all([
      getWalletSummary(address, ['eth', 'base', 'arb']),
      sdkForChain('eth').core.getTokenBalances(address, { type: TokenBalanceType.DEFAULT_TOKENS }),
    ]);

    const nonZero = (tokenResult.tokenBalances ?? []).filter(
      t => t.tokenBalance && BigInt(t.tokenBalance) !== BigInt(0)
    ).slice(0, 5);

    const metadataResults = await Promise.allSettled(
      nonZero.map(t => sdkForChain('eth').core.getTokenMetadata(t.contractAddress))
    );

    const holdings = nonZero.map((t, i) => {
      const meta = metadataResults[i].status === 'fulfilled' ? metadataResults[i].value : null;
      const symbol = meta?.symbol ?? t.contractAddress.slice(0, 6);
      const decimals = meta?.decimals ?? 18;
      const balance = formatTokenBalance(t.tokenBalance ?? '0x0', decimals);
      return { symbol, balance };
    });

    return NextResponse.json({ summary, holdings });
  } catch (err) {
    console.error('[wallet-data]', err);
    return NextResponse.json({ error: 'Failed to fetch wallet data' }, { status: 500 });
  }
}
