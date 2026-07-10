import { redirect } from 'next/navigation';

// Legacy route — courses live inside the world shell education tab.
export default function AllEducationRedirect() {
  redirect('/world/education?tab=courses');
}
