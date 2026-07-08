/**
 * /world/courses — legacy route.
 *
 * The courses landing (journey path + search) now lives as the "My Courses"
 * subtab of the Education parent tab. This route redirects there. The content
 * component is src/components/world/education/CoursesTab.tsx.
 *
 * NOTE: the course reader routes /world/courses/[phaseId] and
 * /world/courses/[phaseId]/[chapterId] remain fully functional — only the
 * bare /world/courses listing moved.
 */

import { redirect } from 'next/navigation';

export default function CoursesPage() {
  redirect('/world/education?tab=courses');
}
