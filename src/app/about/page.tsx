import { redirect } from 'next/navigation';

// Legacy route — About now lives inside the world shell.
export default function AboutRedirect() {
  redirect('/world/about');
}
