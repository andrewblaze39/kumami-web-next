import { redirect } from 'next/navigation';

// Legacy route — the Pro dashboard lives inside the world shell.
export default function ProV2Redirect() {
  redirect('/world/pro');
}
