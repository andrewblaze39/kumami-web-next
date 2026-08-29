/**
 * Typed, cached CoinGlass v4 endpoint fetchers.
 *
 * Every product panel reads through these — the shared TTL cache means an
 * endpoint used by several panels (e.g. liquidation/coin-list feeds both the
 * Console liq24h tile and the heatmap preview) is fetched once per TTL window.
 *
 * TTLs are chosen per the doc's refresh cadence + free-tier delay policy:
 *   fast (~120s)  price/flow-ish   · mid (~300s) derivatives history
 *   slow (~600s+) news/macro/etf/stablecoin (slow-moving)
 *
 * Field shapes below were verified against live responses (2026-08).
 */

import { cgCached } from '../coinglass/client';

export type OHLC = {
  time: number;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
};

export type PairMarketRow = {
  instrument_id: string;
  exchange_name: string;
  symbol: string;
  current_price: number;
  index_price: number;
  price_change_percent_24h: number;
  volume_usd: number;
  long_volume_usd: number;
  short_volume_usd: number;
  open_interest_usd: number;
};

export type LiqCoinRow = {
  symbol: string;
  liquidation_usd_24h: number;
  long_liquidation_usd_24h: number;
  short_liquidation_usd_24h: number;
};

export type GlsRow = {
  time: number;
  global_account_long_percent: number;
  global_account_short_percent: number;
  global_account_long_short_ratio: number;
};

export type TlsRow = {
  time: number;
  top_account_long_percent: number;
  top_account_short_percent: number;
  top_account_long_short_ratio: number;
};

export type CvdRow = {
  time: number;
  agg_taker_buy_vol: number;
  agg_taker_sell_vol: number;
  cum_vol_delta: number;
};

export type PremiumRow = {
  time: number;
  premium: number;
  premium_rate: number; // percent, e.g. -0.0794 = -0.0794%
  coinbase_price: number;
};

export type LiqAggRow = {
  time: number;
  aggregated_long_liquidation_usd: number;
  aggregated_short_liquidation_usd: number;
};

export type NetflowRow = {
  symbol: string;
  net_flow_usd_5m: number;
  net_flow_usd_15m: number;
  net_flow_usd_30m: number;
  net_flow_usd_1h: number;
  [k: string]: number | string;
};

export type WhaleRow = {
  transaction_hash: string;
  amount_usd: string | number;
  asset_quantity: string | number;
  asset_symbol: string;
  from: string;
  to: string;
  blockchain_name: string;
  block_timestamp: number; // seconds
};

export type HyperliquidRow = {
  user: string;
  symbol: string;
  position_size: number; // negative = short
  entry_price: number;
  liq_price: number;
  position_value_usd: number;
  position_action: number;
  create_time: number; // ms
};

export type ExchBalanceRow = {
  exchange_name: string;
  total_balance: number;
  balance_change_1d: number;
  balance_change_7d: number;
  balance_change_30d: number;
};

export type StablecoinHistory = {
  data_list: Array<Record<string, number>>;
  time_list: number[];
  price_list?: number[];
};

export type FearGreedHistory = {
  data_list: number[];
  price_list: number[];
  time_list: number[];
};

export type EtfFlowRow = {
  timestamp: number;
  flow_usd: number;
  price_usd: number;
};

export type ArticleRow = {
  article_title: string;
  article_content: string;
  article_description: string;
  source_name: string;
  article_release_time: number;
  article_picture?: string;
};

export type EconCalRow = {
  calendar_name: string;
  country_code: string;
  country_name: string;
  data_effect: string;
  forecast_value: string;
  previous_value: string;
  published_value: string;
  publish_timestamp: number;
  importance_level: number; // 1..3
};

export type UnlockRow = {
  symbol: string;
  name: string;
  price: number;
  market_cap: number;
  total_locked: number;
  total_unlocked: number;
  circulating_supply: number;
  total_supply: number;
};

// --- fetchers -------------------------------------------------------------

export const fearGreed = () =>
  cgCached<FearGreedHistory>('cg:feargreed', 600, '/api/index/fear-greed-history');

export const etfFlow = (chain: 'bitcoin' | 'ethereum') =>
  cgCached<EtfFlowRow[]>(`cg:etf:${chain}`, 900, `/api/etf/${chain}/flow-history`);

export const fundingOiWeight = (symbol: string, interval: string) =>
  cgCached<OHLC[]>(`cg:funding:${symbol}:${interval}`, 300,
    '/api/futures/funding-rate/oi-weight-history', { symbol, interval });

export const oiAggHistory = (symbol: string, interval: string) =>
  cgCached<OHLC[]>(`cg:oi:${symbol}:${interval}`, 300,
    '/api/futures/open-interest/aggregated-history', { symbol, interval });

export const liqCoinList = () =>
  cgCached<LiqCoinRow[]>('cg:liqcoinlist', 180, '/api/futures/liquidation/coin-list');

export const liqAggHistory = (symbol: string, interval: string, exchange_list = 'Binance') =>
  cgCached<LiqAggRow[]>(`cg:liqagg:${symbol}:${interval}`, 180,
    '/api/futures/liquidation/aggregated-history', { symbol, interval, exchange_list });

export const globalLongShort = (symbol: string, interval: string, exchange = 'Binance') =>
  cgCached<GlsRow[]>(`cg:gls:${symbol}:${interval}`, 300,
    '/api/futures/global-long-short-account-ratio/history', { symbol, interval, exchange });

export const topLongShort = (symbol: string, interval: string, exchange = 'Binance') =>
  cgCached<TlsRow[]>(`cg:tls:${symbol}:${interval}`, 300,
    '/api/futures/top-long-short-account-ratio/history', { symbol, interval, exchange });

export const cvdHistory = (kind: 'futures' | 'spot', symbol: string, interval: string, exchange_list = 'Binance') =>
  cgCached<CvdRow[]>(`cg:cvd:${kind}:${symbol}:${interval}`, 300,
    `/api/${kind}/aggregated-cvd/history`, { symbol, interval, exchange_list });

export const coinbasePremium = (interval: string) =>
  cgCached<PremiumRow[]>(`cg:premium:${interval}`, 300, '/api/coinbase-premium-index', { interval });

export const netflowList = (kind: 'futures' | 'spot') =>
  cgCached<NetflowRow[]>(`cg:netflow:${kind}`, 120, `/api/${kind}/netflow-list`);

export const whaleTransfers = () =>
  cgCached<WhaleRow[]>('cg:whale', 120, '/api/chain/v2/whale-transfer');

export const hyperliquidWhales = () =>
  cgCached<HyperliquidRow[]>('cg:hyperliq', 120, '/api/hyperliquid/whale-alert');

export const exchangeBalance = (symbol: string) =>
  cgCached<ExchBalanceRow[]>(`cg:exchbal:${symbol}`, 600, '/api/exchange/balance/list', { symbol });

export const stablecoinMcap = () =>
  cgCached<StablecoinHistory>('cg:stablecoin', 1800, '/api/index/stableCoin-marketCap-history');

export const pairsMarkets = (symbol: string) =>
  cgCached<PairMarketRow[]>(`cg:pairs:${symbol}`, 120, '/api/futures/pairs-markets', { symbol });

export const priceHistory = (symbol: string, interval: string, exchange = 'Binance') =>
  cgCached<OHLC[]>(`cg:price:${symbol}:${interval}`, 120,
    '/api/futures/price/history', { symbol, interval, exchange });

export type ExchBalanceChart = {
  time_list: number[];
  price_list?: number[];
  data_map: Record<string, number[]>;
};

export const exchangeBalanceChart = (symbol: string) =>
  cgCached<ExchBalanceChart>(`cg:exchbalchart:${symbol}`, 600, '/api/exchange/balance/chart', { symbol });

export const articleList = () =>
  cgCached<ArticleRow[]>('cg:articles', 600, '/api/article/list');

export const economicCalendar = () =>
  cgCached<EconCalRow[]>('cg:econcal', 1800, '/api/calendar/economic-data');

export const coinUnlocks = () =>
  cgCached<UnlockRow[]>('cg:unlocks', 1800, '/api/coin/unlock-list');
