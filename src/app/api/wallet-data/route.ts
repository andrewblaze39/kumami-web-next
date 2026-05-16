import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getWalletSummary, sdkForChain } from '@/lib/alchemy';
import { TokenBalanceType } from 'alchemy-sdk';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.replace('Bearer ', '').trim();

  try {
    await adminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

  try {
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
      const balance = (Number(BigInt(t.tokenBalance ?? '0x0')) / Math.pow(10, decimals)).toFixed(4);
      return { symbol, balance };
    });

    return NextResponse.json({ summary, holdings });
  } catch (err) {
    console.error('[wallet-data]', err);
    return NextResponse.json({ error: 'Failed to fetch wallet data' }, { status: 500 });
  }
}
