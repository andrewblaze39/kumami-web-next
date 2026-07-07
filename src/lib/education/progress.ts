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
  /** Per-part notes keyed by partId. */
  notes: Record<string, string>;
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
  /**
   * When provided: toggles completedParts (true = add, false = remove).
   * When omitted: only the note is updated; completedParts is untouched.
   * I2 fix: decouples note debounce saves from done-toggle to prevent stale-closure races.
   */
  done?: boolean;
  note?: string;
}

export type WriteProgressResult =
  | { success: true; completedParts: string[]; lastPartId: string | null }
  | { success: false; error: string; status: 400 | 500 };

/**
 * Writable dep — merges a partial doc into course_progress/{uid}/courses/{courseId}.
 * Must NEVER receive undefined values (firebase-admin rejects them).
 */
export interface WriteProgressDeps {
  setDoc: (path: string, data: Partial<ProgressDoc> & { updatedAt: unknown }) => Promise<void>;
  getDoc: (path: string) => Promise<ProgressDoc | null>;
  /**
   * Injectable for I4: look up the set of valid partIds for a course.
   * Returns null to fall back to journeyData lesson ids.
   */
  getCoursePartIds?: (courseId: string) => Promise<string[] | null>;
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
 * Returns one entry per journey phase, including notes (I1 fix).
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
        notes: doc?.notes ?? {},
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

/**
 * Default injectable for I4: resolves actual part IDs from the seeded course doc.
 * Falls back to journeyData lesson IDs (via returning null) when db is unavailable.
 */
export async function defaultGetCoursePartIds(courseId: string): Promise<string[] | null> {
  try {
    // Dynamically import to keep this module server-only and avoid circular deps at test time
    const { getCourseDoc } = await import('./courses');
    const doc = await getCourseDoc(courseId);
    if (!doc) return null;
    return doc.chapters.flatMap(ch => ch.parts.map(p => p.id));
  } catch {
    return null;
  }
}

// ---------- Validation ----------

/**
 * Validate courseId + partId.
 *
 * I4 fix: validates courseId cheaply against journeyData; validates partId against
 * the actual course doc's parts (via getCoursePartIds dep), falling back to
 * journeyData lesson ids when the dep returns null.
 *
 * @param getCoursePartIds - injectable; return null to use journeyData fallback
 */
async function validateCourseAndPart(
  courseId: string,
  partId: string,
  getCoursePartIds: (courseId: string) => Promise<string[] | null>,
): Promise<string | undefined> {
  // Cheap courseId check against journeyData
  const phase = getPhaseById(courseId);
  if (!phase) return `Unknown courseId: "${courseId}"`;

  // Part validation: prefer actual course doc, fall back to journeyData
  let validPartIds: string[] | null = await getCoursePartIds(courseId);
  if (!validPartIds) {
    // Fallback: journeyData lesson ids (one part per lesson)
    validPartIds = phase.lessons.map(l => l.id);
  }

  const partExists = validPartIds.includes(partId);
  if (!partExists) return `Unknown partId: "${partId}" for course "${courseId}"`;
  return undefined;
}

// ---------- Write helper ----------

/**
 * Mark a part as done or not-done, optionally saving a note.
 *
 * - done=true  → adds partId if not already present; dedupes
 * - done=false → removes partId from completedParts
 * - done=undefined → note-only save; completedParts untouched (I2 fix)
 * - note       → persisted to notes.{partId} (empty string clears it)
 * - lastPartId → only set when done=true
 *
 * I3 fix: lastPartId is omitted from the Firestore payload (never undefined written).
 *
 * Returns WriteProgressResult — never throws.
 */
export async function markPartDone(
  uid: string,
  payload: MarkPartPayload,
  deps: WriteProgressDeps = {
    getDoc: defaultGetDoc,
    setDoc: defaultSetDoc,
    getCoursePartIds: defaultGetCoursePartIds,
  },
): Promise<WriteProgressResult> {
  const { courseId, partId, done, note } = payload;

  // I5: note length cap (defense-in-depth; route also validates before calling this)
  const NOTE_CAP = 5000;
  if (typeof note === 'string' && note.length > NOTE_CAP) {
    return { success: false, error: 'note_too_long', status: 400 };
  }

  // Validate inputs (I4 fix: uses injectable getCoursePartIds)
  const getPartIds = deps.getCoursePartIds ?? defaultGetCoursePartIds;
  const validationError = await validateCourseAndPart(courseId, partId, getPartIds);
  if (validationError) {
    return { success: false, error: validationError, status: 400 };
  }

  const docPath = `course_progress/${uid}/courses/${courseId}`;

  try {
    // Read current state
    const current = await deps.getDoc(docPath);
    const existing: string[] = current?.completedParts ?? [];
    const existingNotes: Record<string, string> = current?.notes ?? {};

    // Compute new completedParts (only when done is specified)
    let newCompleted: string[];
    if (done === true) {
      newCompleted = existing.includes(partId) ? existing : [...existing, partId];
    } else if (done === false) {
      newCompleted = existing.filter(id => id !== partId);
    } else {
      // done === undefined → note-only save, leave completedParts unchanged
      newCompleted = existing;
    }

    // Determine new lastPartId — only update when marking done=true
    // I3 fix: never write undefined to Firestore; conditionally include key
    const newLastPartId: string | null =
      done === true ? partId : (current?.lastPartId ?? null);

    // Build notes patch
    const newNotes: Record<string, string> = { ...existingNotes };
    if (note !== undefined) {
      newNotes[partId] = note;
    }

    // Build write payload — omit lastPartId key when null (I3 fix)
    const writePayload: Partial<ProgressDoc> & { updatedAt: unknown } = {
      completedParts: newCompleted,
      notes: newNotes,
      updatedAt: new Date().toISOString(),
    };
    if (newLastPartId !== null) {
      writePayload.lastPartId = newLastPartId;
    }

    await deps.setDoc(docPath, writePayload);

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
