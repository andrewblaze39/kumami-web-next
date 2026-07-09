import { redirect } from 'next/navigation';

// Legacy route — the partners page lives inside the world shell.
export default function PartnersRedirect() {
  redirect('/world/partners');
}
