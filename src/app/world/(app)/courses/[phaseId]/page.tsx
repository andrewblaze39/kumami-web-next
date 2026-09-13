/**
 * /world/courses/[phaseId] — legacy route.
 *
 * This used to be a standalone "CFI-style" course reader (CoursePage,
 * backed by a `courses/{phaseId}` Firestore collection with its own
 * chapters/parts/reviews and its own progress tracking). It was never
 * linked from the live Education tab — My Courses links chapters to
 * /world/education/article/[id] instead, reading Firestore
 * education_articles — so this page was a dead end only reachable by
 * guessing/bookmarking the URL, with no admin tooling authoring the
 * `courses` collection it depended on. Redirect to the live level page
 * instead of leaving a second, disconnected course system running.
 */

import { redirect } from 'next/navigation';
import { getPhaseById } from '@/lib/education/journeyData';

interface Props {
  params: Promise<{ phaseId: string }>;
}

export default async function CoursePhaseRedirect({ params }: Props) {
  const { phaseId } = await params;
  const phase = getPhaseById(phaseId);
  redirect(phase ? `/world/education?tab=courses&level=${phase.phase}` : '/world/education?tab=courses');
}
