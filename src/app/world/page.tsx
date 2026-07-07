import { redirect } from 'next/navigation';

// The gate now lives at the site root — /world just bounces there.
export default function WorldGate() {
  redirect('/');
}
