'use client';

/**
 * EducationTabs — subtab container for /world/education.
 *
 * Subtabs (fixed order): Dashboard | My Journey | My Courses | Achievements |
 * Research | Glossary. The active subtab is driven by the `?tab=` query param
 * (default: dashboard). The subtab NAVIGATION lives in the left sidebar
 * (Sidebar.tsx renders the six links nested under the Education nav item);
 * this component only reads `?tab=` and renders the matching content.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ResearchArticle } from '@/lib/research';
import DashboardTab from '@/components/world/education/DashboardTab';
import CoursesTab from '@/components/world/education/CoursesTab';
import JourneyPath from '@/components/world/education/JourneyPath';
import AchievementBadges from '@/components/world/education/AchievementBadges';
import { useEducationProgress } from '@/components/world/education/useEducationProgress';
import { ResearchTab, GlossaryTab } from './WorldEducationClient';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'journey', label: 'My Journey' },
  { key: 'courses', label: 'My Courses' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'research', label: 'Research' },
  { key: 'glossary', label: 'Glossary' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function isTabKey(v: string | null): v is TabKey {
  return TABS.some((t) => t.key === v);
}

// ---------- My Journey subtab ----------

function JourneyTab() {
  const progress = useEducationProgress();
  return <JourneyPath progress={progress} />;
}

// ---------- Achievements subtab ----------

function AchievementsTab() {
  const progress = useEducationProgress();
  return (
    <section className="w-dash-section">
      <h2 className="w-dash-section-title">My Achievements</h2>
      <AchievementBadges progress={progress} />
    </section>
  );
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
      {active === 'dashboard' && <DashboardTab />}
      {active === 'journey' && <JourneyTab />}
      {active === 'courses' && <CoursesTab />}
      {active === 'achievements' && <AchievementsTab />}
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
