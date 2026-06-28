interface HashableHolding {
  symbol: string;
  amount: number;
}

export async function portfolioHash(holdings: HashableHolding[]): Promise<string> {
  const normalized = holdings
    .map((h) => [h.symbol.toUpperCase(), Number(h.amount)] as [string, number])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const data = new TextEncoder().encode(JSON.stringify(normalized));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
