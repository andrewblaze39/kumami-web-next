/**
 * /world/courses/[phaseId]/[chapterId] — Chapter reader page (server component).
 *
 * Loads the course doc, finds the chapter, then renders <ChapterReader> (client).
 * Falls back to notFound() if the phaseId or chapterId are unknown.
 *
 * The ?part= query param is forwarded to ChapterReader as `initialPartId` so
 * the reader can scroll to the correct part on load.
 */

import { notFound } from 'next/navigation';
import { getCourseDoc } from '@/lib/education/courses';
import { getPhaseById } from '@/lib/education/journeyData';
import ChapterReader from '@/components/world/education/ChapterReader';

interface Props {
  params: Promise<{ phaseId: string; chapterId: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}

export async function generateMetadata({ params }: Props) {
  const { phaseId, chapterId } = await params;
  const course = await getCourseDoc(phaseId);
  if (!course) return { title: 'Chapter not found' };
  const chapter = course.chapters.find(c => c.id === chapterId);
  if (!chapter) return { title: 'Chapter not found' };
  return {
    title: `${chapter.title} — Phase ${course.phase} · Kumami World`,
    description: `${course.title}: ${chapter.title}`,
  };
}

export default async function CourseChapter({ params, searchParams }: Props) {
  const { phaseId, chapterId } = await params;
  const sp = await searchParams;

  // Fast check against journeyData (no Firestore)
  const phase = getPhaseById(phaseId);
  if (!phase) notFound();

  // Fetch full course doc (falls back to derived if not seeded)
  const course = await getCourseDoc(phaseId);
  if (!course) notFound();

  // Find the chapter
  const chapter = course.chapters.find(c => c.id === chapterId);
  if (!chapter) notFound();

  const chapterIndex = course.chapters.findIndex(c => c.id === chapterId);

  // Extract ?part= param
  const rawPart = sp.part;
  const initialPartId = Array.isArray(rawPart) ? (rawPart[0] ?? '') : (rawPart ?? '');

  return (
    <div className="w-content-inner">
      <ChapterReader
        course={course}
        chapter={chapter}
        chapterIndex={chapterIndex}
        initialPartId={initialPartId}
      />
    </div>
  );
}
