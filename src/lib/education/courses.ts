/**
 * src/lib/education/courses.ts — server-only Firestore helpers for the `courses` collection.
 * Uses firebase-admin (server SDK). Import only in Server Components / Route Handlers.
 *
 * Firestore schema (courses/{courseId}):
 *   {
 *     phase: number,
 *     title: string,
 *     tagline: string,
 *     level: string,
 *     chapters: Array<{
 *       id: string,
 *       title: string,
 *       parts: Array<{ id: string, title: string, type: 'text'|'video', videoUrl?: string }>
 *     }>,
 *     instructor?: { name, title, bio, avatarUrl },
 *     faq: Array<{ q: string, a: string }>
 *   }
 *
 * FALLBACK: If the Firestore document doesn't exist yet (pre-seed), the module
 * falls back to a structure derived from journeyData. This means the UI works
 * immediately without running the seed script.
 *
 * Fallback structure:
 *   - Each lesson becomes a chapter with a single text part (id = lesson.id).
 *   - instructor = undefined (hidden in UI).
 *   - faq = [] (hidden in UI).
 *
 * Run `npm run seed:courses` to populate real Firestore docs.
 */

import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import { JOURNEY_PHASES, getPhaseById } from './journeyData';

// ---------- Types ----------

export interface CoursePart {
  id: string;
  title: string;
  type: 'text' | 'video';
  videoUrl?: string;
  /** Optional aspect ratio override for video parts. Shorts auto-detect 9:16 when absent. */
  aspect?: '16:9' | '9:16';
}

export interface CourseChapter {
  id: string;
  title: string;
  parts: CoursePart[];
}

export interface CourseInstructor {
  name?: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface CourseFaqItem {
  q: string;
  a: string;
}

export interface CourseDoc {
  courseId: string;
  phase: number;
  title: string;
  tagline: string;
  level: string;
  chapters: CourseChapter[];
  instructor?: CourseInstructor;
  faq: CourseFaqItem[];
}

// ---------- Helpers ----------

/** Safely call adminDb() — returns null if env var is absent (build-time safety). */
function safeDb() {
  try {
    return adminDb();
  } catch {
    return null;
  }
}

/**
 * Derive a CourseDoc from journeyData for a given courseId.
 * Used as a graceful fallback when the Firestore document isn't seeded yet.
 *
 * Structure: each lesson → chapter with one text part (placeholder).
 * Document this clearly so the developer knows what they're getting:
 *   - chapters[i].id = "ch-{i+1}"
 *   - chapters[i].parts[0].id = lesson.id (e.g. "p1-l3")
 *   - instructor = undefined → Instructor tab hidden in UI
 *   - faq = [] → FAQ tab hidden in UI
 */
function derivedCourseDoc(courseId: string): CourseDoc | null {
  const phase = getPhaseById(courseId);
  if (!phase) return null;

  return {
    courseId,
    phase: phase.phase,
    title: phase.title,
    tagline: phase.tagline,
    level: phase.level,
    chapters: phase.lessons.map((lesson, i) => ({
      id: `ch-${i + 1}`,
      title: lesson.title,
      parts: [
        {
          id: lesson.id,
          title: lesson.title,
          type: 'text' as const,
        },
      ],
    })),
    instructor: undefined,
    faq: [],
  };
}

// ---------- Queries ----------

/**
 * Fetch a single course doc by courseId (e.g. "phase-1").
 *
 * Falls back gracefully to the derived structure from journeyData if:
 *   - FIREBASE_SERVICE_ACCOUNT_JSON is not set (build time)
 *   - The Firestore document does not exist (pre-seed)
 *   - Any Firestore error occurs
 *
 * Returns null only if courseId is unknown (not in journeyData).
 */
export async function getCourseDoc(courseId: string): Promise<CourseDoc | null> {
  const db = safeDb();

  if (db) {
    try {
      const snap = await db.collection('courses').doc(courseId).get();
      if (snap.exists) {
        const data = snap.data() as Omit<CourseDoc, 'courseId'>;
        return { courseId, ...data };
      }
      // Document missing — fall through to derived fallback
      console.info(
        `[courses.ts] getCourseDoc: no Firestore doc for "${courseId}". ` +
          'Using journeyData-derived fallback. Run `npm run seed:courses` to populate.'
      );
    } catch (err) {
      console.error('[courses.ts] getCourseDoc Firestore error:', err);
      // Fall through to derived fallback
    }
  }

  return derivedCourseDoc(courseId);
}

/**
 * Fetch all 5 course docs. Used for listing pages.
 * Each doc follows the same fallback rules as getCourseDoc.
 */
export async function getAllCourseDocs(): Promise<CourseDoc[]> {
  return Promise.all(
    JOURNEY_PHASES.map(p => getCourseDoc(p.courseId))
  ).then(docs => docs.filter((d): d is CourseDoc => d !== null));
}

/**
 * Fetch the reviews subcollection for a course.
 * Returns empty array (never throws) so the Reviews tab always renders.
 */
export async function getCourseReviews(
  courseId: string
): Promise<Array<{ id: string; author?: string; rating?: number; text?: string; createdAt?: string }>> {
  const db = safeDb();
  if (!db) return [];

  try {
    const snap = await db
      .collection('courses')
      .doc(courseId)
      .collection('reviews')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snap.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as { author?: string; rating?: number; text?: string; createdAt?: string }),
    }));
  } catch {
    return [];
  }
}
