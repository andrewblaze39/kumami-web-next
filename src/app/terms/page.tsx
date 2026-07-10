import { redirect } from 'next/navigation';

// Legacy route — terms now render inside the world shell.
export default function TermsRedirect() {
  redirect('/world/terms');
}
