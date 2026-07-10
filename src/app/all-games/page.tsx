import { redirect } from 'next/navigation';

// Legacy route — the full games catalogue lives inside the world shell.
export default function AllGamesPage() {
  redirect('/world/games/all');
}
