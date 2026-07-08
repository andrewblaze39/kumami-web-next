'use client';

/**
 * EducationTabs — subtab container for /world/education.
 *
 * Subtabs (fixed order): Dashboard | My Journey | My Courses | Achievements |
 * Research | Glossary. The active subtab is driven by the `?tab=` query param
 * (default: dashboard). Switching tabs updates the URL via router.replace so
 * deep links work without a full navigation.
 *
 * The tab bar reuses the News-portal capsule chip styles (.w-np-cats/.w-np-cat)
 * per the design spec: 12.5px/700, 7px 14px padding, 9px radius, active =
 * accent background + on-accent text.
 */

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const raw = searchParams.get('tab');
  const active: TabKey = isTabKey(raw) ? raw : 'dashboard';

  const selectTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', key);
    router.replace(`/world/education?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-edu-tabs-root">
      <nav
        className="w-np-cats w-edu-subtabs"
        role="tablist"
        aria-label="Education sections"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={`w-np-cat${active === t.key ? ' is-active' : ''}`}
            onClick={() => selectTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

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
