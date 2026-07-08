/**
 * /world/dashboard — legacy route.
 *
 * The learner dashboard now lives as the "Dashboard" subtab of the Education
 * parent tab. This route redirects there permanently. The content component is
 * src/components/world/education/DashboardTab.tsx.
 */

import { redirect } from 'next/navigation';

export default function DashboardPage() {
  redirect('/world/education?tab=dashboard');
}
