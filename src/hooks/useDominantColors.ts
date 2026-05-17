'use client';

// Known brand colors for top coins, keyed by CoinGecko coin ID.
const COIN_BRAND_COLORS: Record<string, string> = {
  bitcoin: '#F7931A',
  ethereum: '#627EEA',
  tether: '#26A17B',
  'usd-coin': '#2775CA',
  binancecoin: '#F3BA2F',
  solana: '#9945FF',
  ripple: '#00AAE4',
  dogecoin: '#C2A633',
  cardano: '#0033AD',
  'avalanche-2': '#E84142',
  chainlink: '#2A5ADA',
  polkadot: '#E6007A',
  uniswap: '#FF007A',
  litecoin: '#A0A0A0',
  cosmos: '#6F7390',
  stellar: '#08B5E5',
  monero: '#FF6600',
  'ethereum-classic': '#328332',
  filecoin: '#0090FF',
  aave: '#B6509E',
  maker: '#1AAB9B',
  'compound-governance-token': '#00D395',
  'curve-dao-token': '#3466A7',
  'pancakeswap-token': '#1FC7D4',
  'matic-network': '#8247E5',
  'polygon-ecosystem-token': '#8247E5',
  near: '#00C08B',
  arbitrum: '#28A0F0',
  optimism: '#FF0420',
  'aptos': '#7ECEF4',
  sui: '#6FBCF0',
  'injective-protocol': '#00F2FE',
  pepe: '#479F53',
  'shiba-inu': '#FFA409',
  floki: '#F5A623',
  'the-open-network': '#0088CC',
  tron: '#FF0013',
  'internet-computer': '#3B00B9',
  'leo-token': '#2D4EA2',
  'fetch-ai': '#181A2D',
  render: '#9E58FF',
  'kaia': '#2D9960',
  'pudgy-penguins': '#7BB4E0',
};

// Fallback palette — used for coins not in the map above.
// Covers a range of hues so adjacent coins look distinct.
const PALETTE = [
  '#E84142', '#F7931A', '#F3BA2F', '#4CAF50', '#627EEA',
  '#9945FF', '#2775CA', '#00AAE4', '#FF007A', '#2A5ADA',
  '#E6007A', '#00D395', '#8247E5', '#28A0F0', '#FF0420',
  '#FF6600', '#08B5E5', '#1AAB9B', '#B6509E', '#0090FF',
];

// Derive a stable color from a string (coin ID or symbol) when not in the map.
function hashColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export interface CoinColorInput {
  coinId: string | null;
  symbol?: string;
}

/**
 * Returns one color per coin — synchronously, no async needed.
 * Uses known brand colors for top coins, falls back to a hash-derived
 * palette color for anything else.
 */
export function useDominantColors(coins: CoinColorInput[]): string[] {
  return coins.map((c) => {
    if (c.coinId && COIN_BRAND_COLORS[c.coinId]) {
      return COIN_BRAND_COLORS[c.coinId];
    }
    const key = c.coinId ?? c.symbol ?? 'unknown';
    return hashColor(key);
  });
}
