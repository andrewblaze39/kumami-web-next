/**
 * GET /api/market/console
 *
 * Returns the ConsolePayload. The Console is a Plus page, so its Flow Radar
 * preview always shows the Flow Radar PLUS feed (Andrew's spec v1.6): the
 * snapshot taken 15 minutes ago (lib/market/flowSnapshots.ts), limited to
 * BTC/ETH/SOL/BNB/HYPE and HIGH/MED events — for every account. This route
 * also refreshes the shared Flow Radar buffer and saves snapshots/history, so
 * the delayed feed keeps filling even when nobody opens Flow Radar itself.
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCachedFresh } from '@/lib/market/cache';
import { getDelayMinutes } from '@/lib/market/gating';
import { readDelayedFlow, saveFlowSnapshot } from '@/lib/market/flowSnapshots';
import { recordFlowDay } from '@/lib/market/flowHistory';
import { aiSentence } from '@/lib/market/llm/gemini';
import { regimeFallback, regimePrompt, type RegimeFacts } from '@/lib/market/llm/aiText';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PLUS_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const [payload, buffer] = await Promise.all([
    getCachedFresh('market:v2:console', 300, () => getProvider().console()),
    getCachedFresh('market:v3:flow-radar', 60, () => getProvider().flowRadar('pro')).catch(() => null),
  ]);
  if (buffer) {
    void saveFlowSnapshot(buffer);
    void recordFlowDay(buffer);
  }

  const delayed = await readDelayedFlow(getDelayMinutes());
  const flowRadar = (delayed?.events ?? []).filter(
    (e) => PLUS_ASSETS.includes(e.asset) && (e.severity === 'HIGH' || e.severity === 'MED'),
  );

  // AI sentence under the regime (v1.15 Platform): rewrites the computed verdict, never changes it.
  // Cached 20 min per verdict + rounded inputs, so it only changes when the picture does.
  const mc = payload.marketConditions;
  const facts: RegimeFacts = {
    verdict: mc.verdict.label,
    confidence: mc.confidence,
    fearGreed: mc.fearGreed,
    fearGreedLabel: mc.fearGreedLabel,
    etf7dUsd: mc.tiles.etfFlow7d?.usd ?? null,
    pctLong: mc.tiles.onChainBias?.pctLong ?? null,
    liq24hUsd: mc.tiles.liq24h?.totalUsd ?? null,
  };
  const bucket = [facts.verdict, facts.fearGreed === null ? 'x' : Math.round(facts.fearGreed / 5),
    facts.etf7dUsd == null ? 'x' : Math.round(facts.etf7dUsd / 1e8), facts.pctLong == null ? 'x' : Math.round(facts.pctLong / 5)].join(':');
  const sentence = await aiSentence(`console:${bucket}`, regimePrompt(facts), regimeFallback(facts));

  return NextResponse.json({
    ...payload,
    marketConditions: { ...mc, interpretation: sentence.text, interpretationAi: sentence.ai },
    flowRadar,
  });
}
