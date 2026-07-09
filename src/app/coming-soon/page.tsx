import { redirect } from 'next/navigation';

// Legacy route — the coming-soon page lives inside the world shell.
export default function ComingSoonRedirect() {
  redirect('/world/subscribe');
}
