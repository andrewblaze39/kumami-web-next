/**
 * /world/education — Education parent tab with subtabs.
 *
 * Subtabs (via ?tab= query param, default dashboard):
 *   Dashboard | My Journey | My Courses | Achievements | Research | Glossary
 *
 * - Dashboard: learner stats, placement quiz, continue-learning (DashboardTab —
 *   formerly the standalone /world/dashboard page, which now redirects here).
 * - My Journey: JourneyPath with client-fetched progress.
 * - My Courses: journey course list + search FAB (CoursesTab — formerly the
 *   standalone /world/courses page, which now redirects here).
 * - Achievements: AchievementBadges grid.
 * - Research: fetched server-side from Firestore `research_articles` via the
 *   admin-SDK src/lib/research.ts module (mirrors the news.ts pattern).
 * - Glossary: static list from src/data/glossaryData.ts with client-side filter.
 */

import type { Metadata } from 'next';
import { getPublishedResearch } from '@/lib/research';
import EducationTabs from './EducationTabs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Education — Kumami World',
  description:
    'Learner dashboard, learning journey, courses, achievements, research and glossary for Kumami World members.',
};

export default async function WorldEducationPage() {
  const articles = await getPublishedResearch(30);

  return (
    <div className="w-content-inner">
      <EducationTabs initialArticles={articles} />
    </div>
  );
}
