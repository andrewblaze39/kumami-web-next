import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ name?: string }>;
}

// Legacy route — game details live inside the world shell.
export default async function GameDetailsPage({ searchParams }: PageProps) {
  const { name } = await searchParams;
  redirect(
    name
      ? `/world/games/details?name=${encodeURIComponent(name)}`
      : '/world/games'
  );
}
