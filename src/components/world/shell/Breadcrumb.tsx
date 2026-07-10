'use client';

import { usePathname } from 'next/navigation';

const LABELS: Record<string, string> = {
  news: 'News Portal',
  courses: 'Courses',
  education: 'Education',
  ailabs: 'AI Labs',
  games: 'Games',
  dashboard: 'Dashboard',
  console: 'Market Intelligence',
  onchain: 'On-Chain Insights',
  intel: 'Intelligence',
  watchlist: 'Watchlist',
  settings: 'Settings',
  pro: 'Kumami Pro',
};

export default function Breadcrumb() {
  const pathname = usePathname();
  // Extract segments after /world/
  // e.g. /world/news → ['news']
  //      /world/intel/abc → ['intel', 'abc']
  const segments = pathname.replace(/^\/world\/?/, '').split('/').filter(Boolean);

  // First segment is the main section
  const section = segments[0] || '';
  const sectionLabel = LABELS[section] || toLabel(section);

  // Sub-segment (if any)
  const sub = segments[1];

  return (
    <nav className="w-crumb" aria-label="Breadcrumb">
      {sectionLabel && <b>{sectionLabel}</b>}
      {sub && (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
          <span>{toLabel(sub)}</span>
        </>
      )}
    </nav>
  );
}

function toLabel(seg: string): string {
  return seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
