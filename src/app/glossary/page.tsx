import { redirect } from 'next/navigation';

// Legacy route — the glossary lives inside the world shell education tab.
export default function GlossaryRedirect() {
  redirect('/world/education?tab=glossary');
}
