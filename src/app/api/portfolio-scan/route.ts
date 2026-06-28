import { NextRequest, NextResponse } from 'next/server';
import type { RiskLevel, ScanResult } from '@/components/portfolio/scan/types';

const N8N_URL = process.env.N8N_PORTFOLIO_SCAN_WEBHOOK_URL;

const LEVELS: RiskLevel[] = ['low', 'medium', 'high'];
const clampLevel = (v: unknown): RiskLevel =>
  typeof v === 'string' && (LEVELS as string[]).includes(v) ? (v as RiskLevel) : 'medium';

const clampScore = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const asString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!N8N_URL) {
    return NextResponse.json(
      { error: 'Portfolio scan not configured (missing env)' },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('[portfolio-scan] n8n unreachable', e);
    return NextResponse.json({ error: 'Scan service unreachable' }, { status: 502 });
  }

  const upstreamText = await upstream.text();

  if (!upstream.ok) {
    console.error('[portfolio-scan] n8n returned', upstream.status, upstreamText.slice(0, 500));
    return NextResponse.json(
      { error: `Scan failed upstream (${upstream.status})`, n8nBody: upstreamText.slice(0, 500) },
      { status: 502 }
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(upstreamText);
  } catch {
    console.error('[portfolio-scan] n8n returned non-JSON:', upstreamText.slice(0, 500));
    return NextResponse.json(
      { error: 'n8n returned non-JSON', n8nBody: upstreamText.slice(0, 500) },
      { status: 502 }
    );
  }

  // n8n may wrap the response in an array
  const data = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>;
  const overall = (data.overall ?? {}) as Record<string, unknown>;

  const result: ScanResult = {
    scannedAt: asString(data.scannedAt) || new Date().toISOString(),
    overall: {
      score: clampScore(overall.score),
      level: clampLevel(overall.level),
      label: asString(overall.label, 'Risk'),
      headline: asString(overall.headline, ''),
    },
    dimensions: (Array.isArray(data.dimensions) ? data.dimensions : []).map(
      (d: Record<string, unknown>) => ({
        key: asString(d.key, 'concentration') as ScanResult['dimensions'][number]['key'],
        level: clampLevel(d.level),
        value: asString(d.value),
      })
    ),
    assets: (Array.isArray(data.assets) ? data.assets : []).map(
      (a: Record<string, unknown>) => ({
        symbol: asString(a.symbol),
        level: clampLevel(a.level),
        note: asString(a.note),
      })
    ),
    actions: (Array.isArray(data.actions) ? data.actions : [])
      .filter((s): s is string => typeof s === 'string')
      .slice(0, 4),
    commentary: asString(data.commentary),
  };

  return NextResponse.json(result);
}
