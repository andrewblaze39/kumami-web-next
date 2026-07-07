/**
 * src/lib/market/llm/interpret.ts
 *
 * Phase 3 stub: deterministic template-based mock interpretations.
 * Phase 6 will replace `interpret()` with a real Claude API call using the
 * PROMPT_TEMPLATES below — the exported constants are part of the contract
 * and must not be renamed or deleted.
 *
 * Prompt templates are copied VERBATIM from:
 *   /Users/andrew/Documents/frankieone/plans/2026-07-05-kumami-pm-requirements-reference.txt
 * Line references are noted per template.
 */

import type { MetricPanelKey } from '../contracts';

// ---------------------------------------------------------------------------
// Verbatim PM prompt templates (unused until Phase 6)
// ---------------------------------------------------------------------------

/**
 * PROMPT: Market Conditions / Console panel
 * Source doc lines 393–400
 */
export const PROMPT_MARKET_CONDITIONS =
  `Given: fear & greed = X, OI trend = X, stablecoin supply \n` +
  `change = X%, funding rate = X%, rule engine verdict = X.\n` +
  `\n` +
  `Write 2 sentences. State what the market structure looks \n` +
  `like right now and what it implies for the near term. \n` +
  `No hedging. No "could" or "might."`;

/**
 * PROMPT: Funding Rate panel
 * Source doc lines 452–459 (detailed section, wins over summary at lines 965–968)
 */
export const PROMPT_FUNDING =
  `Current BTC funding rate (OI-weighted): [X]%.\n` +
  `3-cycle average: [X]%. 7D trend: [rising/falling/flat].\n` +
  `Duration at current extreme: [X] days.\n` +
  `\n` +
  `Write 1 sentence. State what this funding environment means \n` +
  `for leveraged traders right now. Be specific about the risk \n` +
  `direction. No hedging language.`;

/**
 * PROMPT: Liquidations 24H panel
 * Source doc lines 511–519 (detailed section, wins over summary at lines 988–992)
 */
export const PROMPT_LIQUIDATIONS =
  `24H liquidations: $[total]M.\n` +
  `Longs liquidated: $[X]M. Shorts liquidated: $[Y]M.\n` +
  `Largest single coin: [coin] ($[Z]M).\n` +
  `Rule engine tag: [tag].\n` +
  `\n` +
  `Write 1 sentence. Explain what this liquidation profile \n` +
  `means for market structure right now — is the market \n` +
  `cleaner or more fragile after this? Be specific.`;

/**
 * PROMPT: Exchange Netflow panel
 * Source doc lines 561–568
 */
export const PROMPT_NETFLOW =
  `BTC 7D net exchange flow: [direction], $[X]M net [in/out].\n` +
  `Price over same period: [+/-X]%.\n` +
  `Divergence pattern: [tag if applicable, else "none"].\n` +
  `\n` +
  `Write 1 sentence. Explain what the combination of flow \n` +
  `direction and price action implies about who is in control \n` +
  `of this market right now.`;

/**
 * PROMPT: Long/Short Ratio panel
 * Source doc lines 623–631
 */
export const PROMPT_LONGSHORT =
  `BTC global long/short ratio: [X]% long.\n` +
  `Top trader ratio: [X]% long.\n` +
  `Divergence: [smart money fading/leading/aligned].\n` +
  `7D trend: [ratio moving toward more long / more short / stable].\n` +
  `\n` +
  `Write 1 sentence on what the current positioning distribution \n` +
  `means for downside vs upside risk. Mention the smart money \n` +
  `divergence only if it exists.`;

/**
 * PROMPT: CVD (Cumulative Volume Delta) panel
 * Source doc lines 725–733
 */
export const PROMPT_CVD =
  `BTC 24H CVD trend: [rising/falling/flat].\n` +
  `Price over same period: [rising/falling/flat].\n` +
  `Divergence pattern: [tag].\n` +
  `Spot CVD vs Futures CVD: [aligned/diverging].\n` +
  `\n` +
  `Write 1 sentence. Explain whether the current price move \n` +
  `is being driven by genuine buyer/seller aggression or \n` +
  `by forced liquidations. Name the implication for \n` +
  `sustainability of the move.`;

/**
 * PROMPT: Coinbase Premium panel
 * Source doc lines 791–797
 */
export const PROMPT_PREMIUM =
  `Current Coinbase premium: [+/-X]%.\n` +
  `7D trend: [consistently positive/negative/recently flipped].\n` +
  `Cross-signal with netflow: [tag if applicable].\n` +
  `\n` +
  `Write 1 sentence. Explain what the geographic demand \n` +
  `skew implies about the quality and likely sustainability \n` +
  `of the current price move.`;

/**
 * PROMPT: ETF Flow panel
 * Source doc lines 847–856
 */
export const PROMPT_ETF =
  `BTC ETF daily flow: $[X]M [inflow/outflow].\n` +
  `7D cumulative: $[X]M net [in/out].\n` +
  `Price over 7D: [+/-X]%.\n` +
  `Cross-signal: [tag if applicable, else "none"].\n` +
  `\n` +
  `Write 1 sentence. Explain what institutional ETF behavior \n` +
  `is signaling about smart money conviction in the current \n` +
  `market direction. Be specific about whether this \n` +
  `supports or contradicts the price trend.`;

/**
 * PROMPT: Intelligence — A-tier items only (public summary layer)
 * Source doc lines 1043–1052
 */
export const PROMPT_INTELLIGENCE_A_TIER =
  `News item: [headline]. Source: [source]. Category: [category].\n` +
  `Affected assets: [list].\n` +
  `\n` +
  `Write 2 sentences: (1) what happened, in plain English,\n` +
  `no jargon. (2) what the immediate implication is for \n` +
  `crypto markets. Be direct. If uncertain, say what traders \n` +
  `are watching for, not what will happen.`;

/**
 * PROMPT: Intelligence — A-tier, PRO layer (deeper positioning read)
 * Source doc lines 1052–1059
 */
export const PROMPT_INTELLIGENCE_A_TIER_PRO =
  `[Same context as above]\n` +
  `\n` +
  `Now write a trading-desk style interpretation: what does \n` +
  `this mean for positioning? What's the bull case, what's \n` +
  `the bear case, and what level or event would invalidate \n` +
  `each? Max 4 sentences.`;

/**
 * PROMPT: Flow Radar — HIGH severity events only
 * Source doc lines 1136–1143
 */
export const PROMPT_FLOW_RADAR_HIGH =
  `Event: [type]. Asset: [coin]. Amount: $[X]M. \n` +
  `Direction: [inflow/outflow/buy/sell].\n` +
  `Timestamp: [time].\n` +
  `\n` +
  `Write 1 sentence on what this event typically signals \n` +
  `and what traders should watch for as a follow-up. \n` +
  `Be specific to the event type and size. No generic statements.`;

// NOTE: Heatmap, OI, Stablecoin, and Watchlist panels have no LLM prompt in
// the PM doc — the doc explicitly states "No LLM needed" for heatmap (line 668)
// and watchlist (line 1092). OI and stablecoin have no prompt section.
// These panels use the generic fallback in interpret().

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(v: unknown): string {
  return v !== undefined && v !== null ? String(v) : '';
}

function getLabel(context: Record<string, unknown>): string {
  const verdict = context.verdict as Record<string, unknown> | undefined;
  return verdict?.label ? String(verdict.label) : 'Unknown';
}

// ---------------------------------------------------------------------------
// Mock implementation
// All templates produce deterministic 1–2 sentence strings from context.
// Phase 6 replaces this body with a Claude API call using the PROMPT_* above.
// ---------------------------------------------------------------------------

const MOCK_TEMPLATES: Record<
  MetricPanelKey | string,
  (ctx: Record<string, unknown>) => string
> = {
  funding: (ctx) => {
    const label = getLabel(ctx);
    const rate = ctx.fundingRate !== undefined ? ` at ${str(ctx.fundingRate)}%` : '';
    const days = ctx.durationDays !== undefined ? ` for ${str(ctx.durationDays)} days` : '';
    return (
      `Funding is ${label}${rate}${days}, ` +
      `implying leveraged longs face elevated squeeze risk — ` +
      `positions holding against this rate are paying a mechanical tax that compounds pressure.`
    );
  },

  liquidations: (ctx) => {
    const label = getLabel(ctx);
    const total = ctx.totalUsd !== undefined ? `$${str(ctx.totalUsd)}M` : 'significant';
    return (
      `Liquidations are tagged ${label} with ${total} cleared in 24H, ` +
      `leaving market structure cleaner on the dominant side and reducing near-term cascade risk from that direction.`
    );
  },

  netflow: (ctx) => {
    const label = getLabel(ctx);
    const divergence = ctx.divergence ? ` with a ${str(ctx.divergence)} divergence` : '';
    return (
      `Exchange netflow shows ${label}${divergence}, ` +
      `signaling that the dominant cohort is controlling price direction through on-chain conviction, not speculation.`
    );
  },

  longshort: (ctx) => {
    const label = getLabel(ctx);
    const divergence = ctx.smartMoneyDivergence
      ? ` Smart money is ${str(ctx.smartMoneyDivergence)}.`
      : '';
    return (
      `Positioning is ${label}, ` +
      `concentrating liquidation risk on the crowded side if price moves against consensus.` +
      divergence
    );
  },

  heatmap: (ctx) => {
    const label = getLabel(ctx);
    return (
      `Liquidation heatmap shows ${label}, ` +
      `indicating the nearest cluster acts as a price magnet and likely target for the next directional move.`
    );
  },

  cvd: (ctx) => {
    const label = getLabel(ctx);
    const spotVsFutures = ctx.spotFuturesDivergence
      ? ` Spot vs futures CVD: ${str(ctx.spotFuturesDivergence)}.`
      : '';
    return (
      `CVD pattern is ${label}, ` +
      `revealing whether aggressive buyers or sellers are driving price — not passive order-book participants.` +
      spotVsFutures
    );
  },

  premium: (ctx) => {
    const label = getLabel(ctx);
    const pct = ctx.premiumPct !== undefined ? ` (${str(ctx.premiumPct)}%)` : '';
    return (
      `Coinbase premium is ${label}${pct}, ` +
      `reflecting the geographic origin of demand and its likely sustainability versus offshore-driven speculation.`
    );
  },

  etf: (ctx) => {
    const label = getLabel(ctx);
    const flow = ctx.flowUsd !== undefined ? ` at $${str(ctx.flowUsd)}M` : '';
    return (
      `ETF flow is ${label}${flow}, ` +
      `indicating institutional conviction direction — ETF buying forces issuers to acquire spot BTC, creating durable demand.`
    );
  },

  oi: (ctx) => {
    const label = getLabel(ctx);
    return (
      `Open interest is ${label}, ` +
      `showing whether new money is entering the market or leverage is being unwound — the distinction drives move sustainability.`
    );
  },

  stablecoin: (ctx) => {
    const label = getLabel(ctx);
    return (
      `Stablecoin supply is ${label}, ` +
      `indicating how much dry powder is available on the sidelines waiting to be deployed into risk assets.`
    );
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return a deterministic 1–2 sentence interpretation for the given panel.
 *
 * Phase 6 will replace this stub with a real Claude API call. The function
 * signature is the stable interface — do not change it.
 *
 * @param panelKey  One of the 10 MetricPanelKey values, or any string (fallback).
 * @param context   Panel data including at minimum `{ verdict: { label, color }, tags }`.
 */
export async function interpret(
  panelKey: MetricPanelKey | string,
  context: Record<string, unknown>,
): Promise<string> {
  const template = MOCK_TEMPLATES[panelKey as MetricPanelKey];
  if (template) {
    return template(context);
  }
  // Generic fallback for unknown panel keys
  const label = getLabel(context);
  return (
    `Panel ${panelKey} shows ${label}, ` +
    `suggesting the current market condition warrants attention from traders monitoring this metric.`
  );
}
