import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const query = new URL(req.url).searchParams.get('query') ?? '';
  if (!query || query.length < 2) return NextResponse.json([]);

  const response = await fetch(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
    { next: { revalidate: 0 } }
  );
  if (!response.ok) return NextResponse.json([]);

  const data = await response.json();
  // Return top 20 coins from search results, normalized to match CoinGeckoItem shape
  const coins = (data.coins ?? []).slice(0, 20).map((c: { id: string; symbol: string; name: string; thumb: string; large: string; market_cap_rank: number }) => ({
    id: c.id,
    symbol: c.symbol,
    name: c.name,
    image: c.large || c.thumb,
    current_price: 0,       // unknown until selected
    price_change_percentage_24h: 0,
  }));
  return NextResponse.json(coins);
}
