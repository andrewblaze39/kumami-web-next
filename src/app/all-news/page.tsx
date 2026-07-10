import { redirect } from 'next/navigation';

// Legacy route — the all-news archive lives inside the world shell.
export default function AllNewsRedirect() {
  redirect('/world/news/all');
}
