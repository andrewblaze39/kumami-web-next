/**
 * src/lib/education/progress.ts
 *
 * Server-side helpers for reading user course progress.
 * Collection: course_progress/{uid}/courses/{courseId}
 * Fields stored: { completedParts: string[], lastPartId: string, updatedAt: Timestamp }
 *
 * The total part count is derived from journeyData (1 part per lesson) so
 * this module works pre-seed with no Firestore docs.
 *
 * All deps are injectable — unit tests never touch real Firebase.
 */

import 'server-only';
import { JOURNEY_PHASES } from './journeyData';

// ---------- Types ----------

export interface ProgressDoc {
  completedParts?: string[];
  lastPartId?: string;
  updatedAt?: unknown;
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
