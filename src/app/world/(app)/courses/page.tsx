/**
 * /world/courses — Courses landing page (server component).
 *
 * - Journey path is the primary content (replaces featured lessons per PM doc).
 * - Warm-up content goes BELOW the journey.
 * - Search: floating magnifying-glass FAB that expands to an input (client-side
 *   filter over lessons/phases). No big search bar, no "Browse all" button.
 * - Progress data is fetched server-side from the /api/education/progress
 *   endpoint via the user's ID token. Falls back gracefully to empty progress
 *   if the user is not authenticated or the API is unavailable.
 */

import { Suspense } from 'react';
import CoursesClient from './CoursesClient';

export const dynamic = 'force-dynamic';

export default function CoursesPage() {
  return (
    <div className="w-content-inner">
      <header className="w-courses-header">
        <h1 className="w-page-title">Your Learning Journey</h1>
        <p className="w-page-sub">
          Five phases. From buying your first Bitcoin to going professional in Web3.
        </p>
      </header>

      <Suspense fallback={<div className="w-courses-loading">Loading…</div>}>
        <CoursesClient />
      </Suspense>
    </div>
  );
}
