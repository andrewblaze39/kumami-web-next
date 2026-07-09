import { redirect } from 'next/navigation';

// Legacy route — the subscription coming-soon page lives inside the world shell.
export default function SubscribeRedirect() {
  redirect('/world/subscribe');
}
