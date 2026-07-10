import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Legacy route — education articles now render inside the world shell.
export default async function EducationArticleRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/world/education/article/${id}`);
}
