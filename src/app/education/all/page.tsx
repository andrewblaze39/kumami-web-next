import { redirect } from 'next/navigation';

export default function AllEducationPage() {
  redirect('/world/education?tab=courses');
}
