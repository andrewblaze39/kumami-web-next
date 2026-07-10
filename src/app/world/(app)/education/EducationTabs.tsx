'use client';

/**
 * EducationTabs — subtab container for /world/education.
 *
 * Subtabs (fixed order): My Journey | Dashboard | My Courses | Achievements |
 * Research | Glossary. The active subtab is driven by the `?tab=` query param
 * (default: dashboard). The subtab NAVIGATION lives in the left sidebar
 * (Sidebar.tsx renders the six links nested under the Education nav item);
 * this component only reads `?tab=` and renders the matching content.
 *
 * Dashboard / My Journey / My Courses / Achievements render Andrew's ORIGINAL
 * education app pages (src/components/education/embed/*, restored from the old
 * /education routes) inside an EduEmbed wrapper so education.css applies.
 * Research and Glossary keep their world-shell implementations.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ResearchArticle } from '@/lib/research';
import EduEmbed from '@/components/education/embed/EduEmbed';
import DashboardHome from '@/components/education/embed/DashboardHome';
import JourneyHome from '@/components/education/embed/JourneyHome';
import AchievementsHome from '@/components/education/embed/AchievementsHome';
import CoursesHome from '@/components/education/embed/CoursesHome';
import { ResearchTab, GlossaryTab } from './WorldEducationClient';

const TABS = [
  { key: 'journey', label: 'My Journey' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'courses', label: 'My Courses' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'research', label: 'Research' },
  { key: 'glossary', label: 'Glossary' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function isTabKey(v: string | null): v is TabKey {
  return TABS.some((t) => t.key === v);
}

// ---------- Tabs (needs useSearchParams — wrapped in Suspense below) ----------

function EducationTabsInner({
  initialArticles,
}: {
  initialArticles: ResearchArticle[];
}) {
  const searchParams = useSearchParams();

  const raw = searchParams.get('tab');
  const active: TabKey = isTabKey(raw) ? raw : 'dashboard';

  return (
    <div className="w-edu-tabs-root">
      {active === 'dashboard' && <EduEmbed><DashboardHome /></EduEmbed>}
      {active === 'journey' && <EduEmbed><JourneyHome /></EduEmbed>}
      {active === 'courses' && <EduEmbed><CoursesHome /></EduEmbed>}
      {active === 'achievements' && <EduEmbed><AchievementsHome /></EduEmbed>}
      {active === 'research' && <ResearchTab articles={initialArticles} />}
      {active === 'glossary' && <GlossaryTab />}
    </div>
  );
}

// ---------- Public component ----------

interface EducationTabsProps {
  initialArticles: ResearchArticle[];
}

export default function EducationTabs({ initialArticles }: EducationTabsProps) {
  return (
    <Suspense fallback={<div className="w-courses-loading">Loading…</div>}>
      <EducationTabsInner initialArticles={initialArticles} />
    </Suspense>
  );
}
