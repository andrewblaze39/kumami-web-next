import { redirect } from 'next/navigation';

// Legacy route — the course page now lives inside the world shell education
// tab, with the level carried via the ?level= query param.
export default async function EducationPhaseRedirect({
  params,
}: {
  params: Promise<{ phase: string }>;
}) {
  const { phase } = await params;
  const level = parseInt(phase);
  const suffix = Number.isFinite(level) && level >= 1 && level <= 5 ? `&level=${level}` : '';
  redirect(`/world/education?tab=courses${suffix}`);
}
