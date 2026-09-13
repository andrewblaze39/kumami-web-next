'use client';

/**
 * EducationTabs — subtab container for /world/education.
 *
 * Subtabs (fixed order): My Journey | Dashboard | My Courses | Achievements |
 * Cryptopedia | Research | Glossary. The active subtab is driven by the `?tab=`
 * query param (default: dashboard). Only "My Journey", "My Courses", and
 * "Cryptopedia" are linked from the sidebar (Sidebar.tsx) — Dashboard and
 * Achievements stay reachable as direct routes (legacy redirects, in-page
 * links from Dashboard) but aren't separate top-level nav items. "research"
 * and "glossary" also stay reachable directly (breadcrumbs from article/term
 * detail pages link back to them) but are superseded by "cryptopedia", which
 * renders the same two sections behind a capsule selector.
 *
 * "My Journey" is smart: first-time users (no progress in any of the 5 levels)
 * see the level-picker intro (JourneyHome); once they've started any level,
 * it shows the same experience as Dashboard instead — persisted per-user via
 * useHasStartedEducation, so the intro never comes back after they've begun.
 *
 * Dashboard / My Journey / My Courses / Achievements render Andrew's ORIGINAL
 * education app pages (src/components/education/embed/*, restored from the old
 * /education routes) inside an EduEmbed wrapper so education.css applies.
 * Cryptopedia, Research, and Glossary keep their world-shell implementations.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ResearchArticle } from '@/lib/research';
import EduEmbed from '@/components/education/embed/EduEmbed';
import DashboardHome from '@/components/education/embed/DashboardHome';
import JourneyHome from '@/components/education/embed/JourneyHome';
import AchievementsHome from '@/components/education/embed/AchievementsHome';
import CoursesHome from '@/components/education/embed/CoursesHome';
import { useHasStartedEducation } from '@/hooks/useHasStartedEducation';
import { CryptopediaTab, ResearchTab, GlossaryTab } from './WorldEducationClient';

const TABS = [
  { key: 'journey', label: 'My Journey' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'courses', label: 'My Courses' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'cryptopedia', label: 'Cryptopedia' },
  { key: 'research', label: 'Research' },
  { key: 'glossary', label: 'Glossary' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function isTabKey(v: string | null): v is TabKey {
  return TABS.some((t) => t.key === v);
}

/** "My Journey" — level-picker intro for new users, Dashboard once started. */
function JourneyOrDashboard() {
  const { hasStarted, loaded } = useHasStartedEducation();
  if (!loaded) return null; // avoid a flash of the wrong view while progress loads
  return hasStarted ? <DashboardHome /> : <JourneyHome />;
}

// ---------- Tabs (needs useSearchParams — wrapped in Suspense below) ----------

function EducationTabsInner({
  initialArticles,
}: {
  initialArticles: ResearchArticle[];
}) {
  const searchParams = useSearchParams();

  const raw = searchParams.get('tab');
  const active: TabKey = isTabKey(raw) ? raw : 'journey';

  return (
    <div className="w-edu-tabs-root">
      {active === 'dashboard' && <EduEmbed><DashboardHome /></EduEmbed>}
      {active === 'journey' && <EduEmbed><JourneyOrDashboard /></EduEmbed>}
      {active === 'courses' && <EduEmbed><CoursesHome /></EduEmbed>}
      {active === 'achievements' && <EduEmbed><AchievementsHome /></EduEmbed>}
      {active === 'cryptopedia' && <CryptopediaTab articles={initialArticles} />}
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
