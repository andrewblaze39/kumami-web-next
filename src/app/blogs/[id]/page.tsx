import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Legacy route — blog post details live inside the world shell.
export default async function BlogDetailRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/world/blogs/${id}`);
}
