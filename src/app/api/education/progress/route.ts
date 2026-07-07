/**
 * GET  /api/education/progress  — Returns per-phase course progress for the authed user.
 * POST /api/education/progress  — Mark a part done/undone, optionally save a note.
 *
 * Both endpoints use Bearer token auth (same pattern as market API routes).
 *
 * POST request body:
 * {
 *   courseId: string,   // e.g. "phase-1"
 *   partId:   string,   // e.g. "p1-l3"
 *   done:     boolean,
 *   note?:    string,   // optional per-part note (empty string clears)
 * }
 *
 * POST response on success (200):
 * { completedParts: string[], lastPartId: string | null }
 *
 * GET response shape:
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
import { getUserCourseProgress, markPartDone } from '@/lib/education/progress';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const progress = await getUserCourseProgress(uid);

  return NextResponse.json({ progress });
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).courseId !== 'string' ||
    typeof (body as Record<string, unknown>).partId !== 'string' ||
    typeof (body as Record<string, unknown>).done !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'Body must have courseId (string), partId (string), done (boolean)' },
      { status: 400 },
    );
  }

  const { courseId, partId, done, note } = body as {
    courseId: string;
    partId: string;
    done: boolean;
    note?: string;
  };

  const result = await markPartDone(uid, {
    courseId,
    partId,
    done,
    note: typeof note === 'string' ? note : undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    completedParts: result.completedParts,
    lastPartId: result.lastPartId,
  });
}
