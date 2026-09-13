/**
 * /world/courses/[phaseId]/[chapterId] — legacy route.
 *
 * Part of the same orphaned course-reader system as /world/courses/[phaseId]
 * (see that file's comment) — never linked from the live Education tab, no
 * admin tooling behind its data source. Redirects to the live level page;
 * there's no exact chapter-level equivalent to redirect to (the live system
 * addresses chapters by Firestore article id, not this phase/chapter slug).
 */

import { redirect } from 'next/navigation';
import { getPhaseById } from '@/lib/education/journeyData';

interface Props {
  params: Promise<{ phaseId: string; chapterId: string }>;
}

export default async function CourseChapterRedirect({ params }: Props) {
  const { phaseId } = await params;
  const phase = getPhaseById(phaseId);
  redirect(phase ? `/world/education?tab=courses&level=${phase.phase}` : '/world/education?tab=courses');
}
