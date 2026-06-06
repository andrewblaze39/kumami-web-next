import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paramsObj: Record<string, string> = {
    vs_currency: searchParams.get('vs_currency') ?? 'usd',
    order: searchParams.get('order') ?? 'market_cap_desc',
    per_page: searchParams.get('per_page') ?? '100',
    page: searchParams.get('page') ?? '1',
    sparkline: 'false',
  };
  const params = new URLSearchParams(paramsObj);
  // ids contains commas — append raw so URLSearchParams doesn't encode them as %2C
  const ids = searchParams.get('ids');
  const idsSegment = ids ? `&ids=${ids}` : '';

  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?${params}${idsSegment}`,
    { next: { revalidate: 300 } }
  );

  if (!response.ok) {
    return NextResponse.json({ error: `CoinGecko error: ${response.status}` }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=120' },
  });
}
