/**
 * GET  /api/education/progress  — Returns per-phase course progress for the authed user.
 * POST /api/education/progress  — Mark a part done/undone, optionally save a note.
 *
 * Both endpoints use Bearer token auth (same pattern as market API routes).
 *
 * POST request body:
 * {
 *   courseId: string,    // e.g. "phase-1"
 *   partId:   string,    // e.g. "p1-l3"
 *   done?:    boolean,   // omit for note-only saves (I2 fix: decouples note debounce from done toggle)
 *   note?:    string,    // optional per-part note (empty string clears); max NOTE_CAP chars (I5)
 * }
 *
 * POST response on success (200):
 * { completedParts: string[], lastPartId: string | null }
 *
 * GET response shape (I1 fix: includes notes):
 * {
 *   progress: Array<{
 *     courseId: string,
 *     completedParts: string[],
 *     lastPartId: string | null,
 *     totalParts: number,
 *     notes: Record<string, string>,
 *   }>
 * }
 */

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/market/api-helpers';
import { getUserCourseProgress, markPartDone } from '@/lib/education/progress';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Maximum note length (I5). */
const NOTE_CAP = 5000;

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  // I1 fix: getUserCourseProgress now includes notes in each entry
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
    typeof (body as Record<string, unknown>).partId !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Body must have courseId (string) and partId (string)' },
      { status: 400 },
    );
  }

  const b = body as Record<string, unknown>;

  // I2 fix: `done` is now optional — omit for note-only saves
  const doneRaw = b.done;
  if (doneRaw !== undefined && typeof doneRaw !== 'boolean') {
    return NextResponse.json(
      { error: 'done must be a boolean when provided' },
      { status: 400 },
    );
  }

  // I5: note length cap
  const noteRaw = b.note;
  if (noteRaw !== undefined && typeof noteRaw !== 'string') {
    return NextResponse.json({ error: 'note must be a string when provided' }, { status: 400 });
  }
  if (typeof noteRaw === 'string' && noteRaw.length > NOTE_CAP) {
    return NextResponse.json({ error: 'note_too_long' }, { status: 400 });
  }

  const { courseId, partId } = b as { courseId: string; partId: string };
  const done = doneRaw as boolean | undefined;
  const note = noteRaw as string | undefined;

  const result = await markPartDone(uid, { courseId, partId, done, note });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    completedParts: result.completedParts,
    lastPartId: result.lastPartId,
  });
}
