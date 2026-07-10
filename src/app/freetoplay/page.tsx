import { redirect } from 'next/navigation';

// Legacy route — games live inside the world shell.
export default function FreeToPlayPage() {
  redirect('/world/games');
}
