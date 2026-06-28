export type RiskLevel = 'low' | 'medium' | 'high';

export type DimensionKey =
  | 'concentration'
  | 'diversification'
  | 'volatility'
  | 'liquidity';

export interface ScanResult {
  scannedAt: string;
  overall: {
    score: number;
    level: RiskLevel;
    label: string;
    headline: string;
  };
  dimensions: Array<{
    key: DimensionKey;
    level: RiskLevel;
    value: string;
  }>;
  assets: Array<{
    symbol: string;
    level: RiskLevel;
    note: string;
  }>;
  actions: string[];
  commentary: string;
}

export type ScanStage = 'idle' | 'loading' | 'results' | 'error';

export interface ScanRequestHolding {
  symbol: string;
  amount: number;
  valueUsd: number;
  allocationPct: number;
  change24h: number;
}

export interface ScanRequest {
  userId?: string;
  currency: 'USD';
  totalValue: number;
  holdings: ScanRequestHolding[];
}

export const LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#4ade80',
  medium: '#FACC15',
  high: '#f87171',
};

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  concentration: 'Concentration',
  diversification: 'Diversification',
  volatility: 'Volatility',
  liquidity: 'Liquidity',
};

export const LEVEL_TAG: Record<RiskLevel, string> = {
  low: 'LOW',
  medium: 'WATCH',
  high: 'HIGH',
};
