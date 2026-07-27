import { redirect } from 'next/navigation';

// Legacy route — the glossary term detail now lives inside the world shell.
export default async function GlossaryTermRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/world/glossary/${id}`);
}
