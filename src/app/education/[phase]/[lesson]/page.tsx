import { redirect } from 'next/navigation';

// Legacy route — lesson params don't map to world article ids, so land on the
// courses tab for the matching level.
export default async function EducationLessonRedirect({
  params,
}: {
  params: Promise<{ phase: string; lesson: string }>;
}) {
  const { phase } = await params;
  const level = parseInt(phase);
  const suffix = Number.isFinite(level) && level >= 1 && level <= 5 ? `&level=${level}` : '';
  redirect(`/world/education?tab=courses${suffix}`);
}
