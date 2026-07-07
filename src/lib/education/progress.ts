/**
 * src/lib/education/progress.ts
 *
 * Server-side helpers for reading and writing user course progress.
 * Collection: course_progress/{uid}/courses/{courseId}
 * Fields stored: {
 *   completedParts: string[],
 *   lastPartId: string,
 *   updatedAt: Timestamp,
 *   notes: Record<partId, string>   ← optional per-part note
 * }
 *
 * The total part count is derived from journeyData (1 part per lesson) so
 * this module works pre-seed with no Firestore docs.
 *
 * All deps are injectable — unit tests never touch real Firebase.
 */

import 'server-only';
import { JOURNEY_PHASES, getPhaseById } from './journeyData';

// ---------- Types ----------

export interface ProgressDoc {
  completedParts?: string[];
  lastPartId?: string;
  updatedAt?: unknown;
  notes?: Record<string, string>;
}

export interface CourseProgress {
  courseId: string;
  completedParts: string[];
  lastPartId: string | null;
  /** Total parts in the course (derived from journeyData — 1 part per lesson). */
  totalParts: number;
}

export interface ProgressDeps {
  /**
   * Read a single Firestore document at the given path.
   * Returns null if the document does not exist or on error.
   */
  getDoc: (path: string) => Promise<ProgressDoc | null>;
}

// ---------- Write types ----------

export interface MarkPartPayload {
  courseId: string;
  partId: string;
  done: boolean;
  note?: string;
}

export type WriteProgressResult =
  | { success: true; completedParts: string[]; lastPartId: string | null }
  | { success: false; error: string; status: 400 | 500 };

/**
 * Writable dep — merges a partial doc into course_progress/{uid}/courses/{courseId}.
 */
export interface WriteProgressDeps {
  setDoc: (path: string, data: Partial<ProgressDoc> & { updatedAt: unknown }) => Promise<void>;
  getDoc: (path: string) => Promise<ProgressDoc | null>;
}

// ---------- Default Firestore dep ----------

export async function defaultGetDoc(path: string): Promise<ProgressDoc | null> {
  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    const db = adminDb();
    const snap = await db.doc(path).get();
    if (!snap.exists) return null;
    return snap.data() as ProgressDoc;
  } catch {
    return null;
  }
}

// ---------- Helpers ----------

/** Total parts count per courseId, derived from journeyData (1 part / lesson). */
function totalPartsMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const phase of JOURNEY_PHASES) {
    map[phase.courseId] = phase.lessons.length;
  }
  return map;
}

// ---------- Main query ----------

/**
 * Fetch per-phase progress for a user.
 * Returns one entry per journey phase.
 */
export async function getUserCourseProgress(
  uid: string,
  deps: ProgressDeps = { getDoc: defaultGetDoc },
): Promise<CourseProgress[]> {
  const totals = totalPartsMap();

  const results = await Promise.all(
    JOURNEY_PHASES.map(async (phase) => {
      const path = `course_progress/${uid}/courses/${phase.courseId}`;
      const doc = await deps.getDoc(path);
      return {
        courseId: phase.courseId,
        completedParts: doc?.completedParts ?? [],
        lastPartId: doc?.lastPartId ?? null,
        totalParts: totals[phase.courseId] ?? 0,
      } satisfies CourseProgress;
    }),
  );

  return results;
}

// ---------- Default write dep ----------

export async function defaultSetDoc(
  path: string,
  data: Partial<ProgressDoc> & { updatedAt: unknown },
): Promise<void> {
  const { adminDb } = await import('@/lib/firebase-admin');
  const db = adminDb();
  await db.doc(path).set(data, { merge: true });
}

// ---------- Write helper ----------

/**
 * Validate that:
 * - courseId is a known journey phase
 * - partId exists within that course's lessons
 *
 * Returns an error string on failure, undefined on success.
 * Validates against journeyData only (always available, no Firestore needed).
 */
function validateCourseAndPart(courseId: string, partId: string): string | undefined {
  const phase = getPhaseById(courseId);
  if (!phase) return `Unknown courseId: "${courseId}"`;
  const partExists = phase.lessons.some(l => l.id === partId);
  if (!partExists) return `Unknown partId: "${partId}" for course "${courseId}"`;
  return undefined;
}

/**
 * Mark a part as done or not-done, optionally saving a note.
 *
 * - done=true  → arrayUnion-style: adds partId if not already present; dedupes
 * - done=false → removes partId from completedParts
 * - note       → persisted to notes.{partId} (empty string clears it)
 * - lastPartId → always set to partId on done=true
 *
 * Validates courseId and partId against journeyData (fast, no Firestore read).
 * Returns WriteProgressResult — never throws.
 */
export async function markPartDone(
  uid: string,
  payload: MarkPartPayload,
  deps: WriteProgressDeps = { getDoc: defaultGetDoc, setDoc: defaultSetDoc },
): Promise<WriteProgressResult> {
  const { courseId, partId, done, note } = payload;

  // Validate inputs
  const validationError = validateCourseAndPart(courseId, partId);
  if (validationError) {
    return { success: false, error: validationError, status: 400 };
  }

  const docPath = `course_progress/${uid}/courses/${courseId}`;

  try {
    // Read current state (so we can compute the new completedParts client-side)
    const current = await deps.getDoc(docPath);
    const existing: string[] = current?.completedParts ?? [];
    const existingNotes: Record<string, string> = current?.notes ?? {};

    // Compute new completedParts
    let newCompleted: string[];
    if (done) {
      // arrayUnion — add and dedupe
      newCompleted = existing.includes(partId)
        ? existing
        : [...existing, partId];
    } else {
      // remove
      newCompleted = existing.filter(id => id !== partId);
    }

    // Determine new lastPartId
    const newLastPartId = done ? partId : (current?.lastPartId ?? null);

    // Build notes patch
    const newNotes: Record<string, string> = { ...existingNotes };
    if (note !== undefined) {
      newNotes[partId] = note;
    }

    // Write merged doc
    await deps.setDoc(docPath, {
      completedParts: newCompleted,
      lastPartId: newLastPartId ?? undefined,
      notes: newNotes,
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      completedParts: newCompleted,
      lastPartId: newLastPartId,
    };
  } catch (err) {
    console.error('[progress.ts] markPartDone error:', err);
    return { success: false, error: 'Internal error', status: 500 };
  }
}
