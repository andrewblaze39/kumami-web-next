/**
 * Flow Radar event classifier — Rachelle v1.15 Plus §3 (shared by Flow Radar
 * Plus and Pro). Pure: raw event facts in, severity + direction + description
 * out. `null` severity = below the floor, don't emit the event.
 *
 * 1. whale_transfer (deposits to / withdrawals from an exchange only — the
 *    caller drops exchange↔exchange and wallet↔wallet moves):
 *      to exchange = Inflow (bearish) · from exchange = Outflow (bullish)
 *      HIGH ≥ $100M · MED $10–100M · below $10M not emitted (the API floor)
 *
 * 2. exchange_flow — "Dry Powder" (USDT/USDC net per exchange, rolling 60 min):
 *      stablecoins onto exchanges = Dry Powder In (bullish), off = Dry Powder Out (bearish)
 *      HIGH ≥ $500M · MED $100–500M · LOW $25–100M (Pro) · below $25M not emitted
 *
 * 3. liq_spike (1h liquidations summed over 5 exchanges):
 *      longs > 70% = Long Flush (bearish) · < 30% = Short Squeeze (bullish)
 *      otherwise Two-sided Flush (neutral)
 *      HIGH ≥ $200M/h · MED $50–200M/h · LOW $10–50M/h (Pro) · below $10M not emitted
 *
 * 4. smart_money (Hyperliquid positions ≥ $1M; the API has no confidence field,
 *    so severity is by size, per coin):
 *      opened long = Long Opened (bullish) · opened short = Short Opened (bearish)
 *      closed = Position Closed (neutral)
 *      HIGH ≥ $100M any coin, ≥ $25M BTC/ETH, ≥ $10M others
 *      MED  ≥ $5M BTC/ETH, ≥ $2M others · LOW ≥ $1M (Pro)
 *
 * netflow_flip (Pro): always MED, Buy/Sell Pressure — unchanged.
 * whale_wall: still blocked on the current data plan; logic kept.
 */

import type { FlowEvent } from '../contracts';

export type FlowRadarResult = {
  severity: FlowEvent['severity'];
  direction: FlowEvent['direction'];
  description: string;
};

export type FlowRadarInputs = {
  type: FlowEvent['type'];
  asset: string;
  amountUsd: number;
  /** whale_transfer: true = deposit to an exchange, false = withdrawal. */
  toExchange?: boolean;
  /** exchange_flow: true = stablecoins net INTO exchanges over the window. */
  netIntoExchanges?: boolean;
  /** exchange_flow: exchange name for the description. */
  exchange?: string;
  /** liq_spike: share of the liquidated $ that were longs (0–1). */
  longShare?: number;
  /** smart_money: long (true) or short (false). */
  isLong?: boolean;
  /** smart_money: true = the position was closed (neutral). */
  closed?: boolean;
  /** netflow_flip: true = flipped to net buying. */
  flippedPositive?: boolean;
  /** whale_wall: order above the price (resistance) or below (support). */
  abovePrice?: boolean;
  /** whale_wall: distance from price as a fraction. */
  distanceFromPrice?: number;
};

const M = 1_000_000;
const fmtM = (usd: number) => `$${(usd / M).toFixed(usd >= 10 * M ? 0 : 1)}M`;

/** Severity for a dollar amount given the HIGH / MED / LOW floors (LOW optional). */
function tier(usd: number, high: number, med: number, low?: number): FlowEvent['severity'] | null {
  if (usd >= high) return 'HIGH';
  if (usd >= med) return 'MED';
  if (low !== undefined && usd >= low) return 'LOW';
  return null;
}

const MAJORS = new Set(['BTC', 'ETH']);

/** Hyperliquid lists some coins per 1,000 units with a "k" prefix (kPEPE, kBONK): show the coin itself. */
export function hyperliquidAsset(symbol: string): string {
  return (/^k[A-Z0-9]{2,}$/.test(symbol) ? symbol.slice(1) : symbol).toUpperCase();
}

/** Smart-money size tiers (v1.15 Plus §3 event 4). */
export function smartMoneySeverity(asset: string, usd: number): FlowEvent['severity'] | null {
  const major = MAJORS.has(asset.toUpperCase());
  if (usd >= 100 * M || usd >= (major ? 25 : 10) * M) return 'HIGH';
  if (usd >= (major ? 5 : 2) * M) return 'MED';
  if (usd >= 1 * M) return 'LOW';
  return null;
}

/** null = below the event's floor — the caller skips it. */
export function computeFlowRadar(inputs: FlowRadarInputs): FlowRadarResult | null {
  const { type, asset, amountUsd } = inputs;

  switch (type) {
    case 'whale_transfer': {
      const severity = tier(amountUsd, 100 * M, 10 * M);
      if (!severity) return null;
      const direction = inputs.toExchange ? 'Inflow' : 'Outflow';
      const label = inputs.toExchange ? 'deposited to an exchange' : 'withdrawn from an exchange';
      return { severity, direction, description: `${fmtM(amountUsd)} of ${asset} ${label}` };
    }

    case 'exchange_flow': {
      const severity = tier(amountUsd, 500 * M, 100 * M, 25 * M);
      if (!severity) return null;
      const into = !!inputs.netIntoExchanges;
      const where = inputs.exchange ? ` ${into ? 'onto' : 'off'} ${inputs.exchange}` : into ? ' onto exchanges' : ' off exchanges';
      return {
        severity,
        direction: into ? 'Dry Powder In' : 'Dry Powder Out',
        description: `${fmtM(amountUsd)} net ${asset}${where} in the last hour — ${into ? 'buying power arriving' : 'buying power leaving'}`,
      };
    }

    case 'liq_spike': {
      const severity = tier(amountUsd, 200 * M, 50 * M, 10 * M);
      if (!severity) return null;
      const longShare = inputs.longShare ?? 0.5;
      const direction: FlowEvent['direction'] =
        longShare > 0.7 ? 'Long Flush' : longShare < 0.3 ? 'Short Squeeze' : 'Two-sided Flush';
      const who = direction === 'Long Flush' ? 'longs wiped out' : direction === 'Short Squeeze' ? 'shorts squeezed' : 'both sides flushed';
      return {
        severity,
        direction,
        description: `${asset} ${fmtM(amountUsd)} liquidated in 1h — ${who} (${Math.round(longShare * 100)}% longs)`,
      };
    }

    case 'smart_money': {
      const severity = smartMoneySeverity(asset, amountUsd);
      if (!severity) return null;
      const side = inputs.isLong ? 'long' : 'short';
      if (inputs.closed) {
        return { severity, direction: 'Position Closed', description: `${asset} ${side} closed: ${fmtM(amountUsd)}` };
      }
      return {
        severity,
        direction: inputs.isLong ? 'Long Opened' : 'Short Opened',
        description: `${asset} ${side} opened: ${fmtM(amountUsd)}`,
      };
    }

    case 'netflow_flip': {
      const direction: FlowEvent['direction'] = inputs.flippedPositive ? 'Buy Pressure' : 'Sell Pressure';
      const label = inputs.flippedPositive ? 'sell→buy flip' : 'buy→sell flip';
      return { severity: 'MED', direction, description: `${asset} netflow flip: ${label}` };
    }

    case 'whale_wall': {
      const withinRange = (inputs.distanceFromPrice ?? Infinity) <= 0.05;
      const severity: FlowEvent['severity'] = amountUsd > 50 * M && withinRange ? 'MED' : 'LOW';
      const direction: FlowEvent['direction'] = inputs.abovePrice ? 'Resistance Wall' : 'Support Wall';
      const label = inputs.abovePrice ? 'resistance wall' : 'support wall';
      return { severity, direction, description: `${asset} whale ${label}: ${fmtM(amountUsd)}` };
    }
  }
}
