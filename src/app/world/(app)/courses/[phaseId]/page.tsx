/**
 * /world/courses/[phaseId] — CFI-style course detail page (server component).
 *
 * Data fetching:
 * 1. Course doc from Firestore `courses/{phaseId}` via getCourseDoc().
 *    Falls back gracefully to journeyData-derived structure if:
 *    - FIREBASE_SERVICE_ACCOUNT_JSON not set (build time)
 *    - Firestore doc doesn't exist yet (pre-seed)
 *    This fallback makes the UI work before running `npm run seed:courses`.
 *
 * 2. Progress from `course_progress/{uid}/courses/{phaseId}`.
 *    Falls back to empty progress if user session is unavailable server-side.
 *    (Progress is also loaded client-side via the API route as fallback.)
 *
 * 3. Reviews subcollection — empty array on failure.
 *
 * NOTE: The "Resume course" button deep-links to /world/courses/[phaseId]/[chapterId]
 * which is built in Task 5.3. The link may 404 until then.
 */

import { notFound } from 'next/navigation';
import { getCourseDoc, getCourseReviews } from '@/lib/education/courses';
import { getPhaseById } from '@/lib/education/journeyData';
import CoursePage from '@/components/world/education/CoursePage';
import type { CourseProgress } from '@/lib/education/progress';

interface Props {
  params: Promise<{ phaseId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { phaseId } = await params;
  const phase = getPhaseById(phaseId);
  if (!phase) return { title: 'Course not found' };
  return {
    title: `Phase ${phase.phase}: ${phase.title} — Kumami World`,
    description: phase.tagline,
  };
}

export default async function CoursePhase({ params }: Props) {
  const { phaseId } = await params;

  // Validate the phase exists in journeyData first (fast check, no Firestore)
  const phase = getPhaseById(phaseId);
  if (!phase) notFound();

  // Fetch course doc (falls back to derived structure if not seeded)
  const course = await getCourseDoc(phaseId);
  if (!course) notFound();

  // Fetch reviews (empty array if subcollection is empty or on error)
  const reviews = await getCourseReviews(phaseId);

  // Progress: server-side we don't have the user session in App Router server components
  // without passing the token. The client-side CoursePage will re-fetch if needed.
  // For the initial render we use empty progress (graceful degradation).
  const emptyProgress: CourseProgress = {
    courseId: phaseId,
    completedParts: [],
    lastPartId: null,
    totalParts: course.chapters.reduce((sum, ch) => sum + ch.parts.length, 0),
  };

  return (
    <div className="w-content-inner">
      <CoursePage
        course={course}
        progress={emptyProgress}
        reviews={reviews}
      />
    </div>
  );
}
