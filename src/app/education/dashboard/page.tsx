import { redirect } from 'next/navigation';

export default function EducationDashboardPage() {
  redirect('/world/education?tab=dashboard');
}
