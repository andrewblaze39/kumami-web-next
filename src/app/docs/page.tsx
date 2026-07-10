import { redirect } from 'next/navigation';

// Legacy coming-soon stub — send visitors into the world shell.
export default function DocsRedirect() {
  redirect('/world/subscribe');
}
