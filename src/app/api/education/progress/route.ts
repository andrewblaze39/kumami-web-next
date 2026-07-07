/**
 * GET /api/education/progress
 *
 * Returns per-phase course progress for the authenticated user.
 * Uses Bearer token auth (same pattern as market API routes).
 *
 * Response shape:
 * {
 *   progress: Array<{
 *     courseId: string,
 *     completedParts: string[],
 *     lastPartId: string | null,
 *     totalParts: number,
 *   }>
 * }
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getUserCourseProgress } from '@/lib/education/progress';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const progress = await getUserCourseProgress(uid);

  return NextResponse.json({ progress });
}
