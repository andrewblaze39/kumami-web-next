import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Legacy route — research article details live inside the world shell.
export default async function ResearchDetailRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/world/research/${id}`);
}
