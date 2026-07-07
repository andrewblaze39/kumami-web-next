/**
 * GET /api/market/intelligence
 *
 * Returns an IntelligencePayload. Free-tier users have the proInterpretation
 * field stripped from each brief (this is a tier-sensitive field per the
 * contracts — IntelligencePayload.briefs[].proInterpretation is pro-only).
 * All other fields (headline, summary, tier label, etc.) pass through for
 * all tiers.
 *
 * Cache: 300s, tier-independent key (pro payload cached; proInterpretation
 * stripped server-side for free users after retrieval).
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getProvider } from '@/lib/market/provider';
import { getCached } from '@/lib/market/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { tier } = auth;

  // Cache the full pro payload; strip pro fields server-side for free users
  const fullPayload = await getCached(
    'market:intelligence',
    300,
    () => getProvider().intelligence('pro'),
  );

  if (tier === 'free') {
    // Strip proInterpretation text for free users; keep hasProInterpretation flag
    // so the client can render the locked shell without knowing the text content.
    return NextResponse.json({
      briefs: fullPayload.briefs.map(({ proInterpretation: _pi, ...brief }) => brief),
    });
  }

  return NextResponse.json(fullPayload);
}
