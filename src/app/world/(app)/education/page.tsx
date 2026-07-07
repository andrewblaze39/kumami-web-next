/**
 * /world/education — Education tab
 *
 * Two sections per PM:
 *  1. Research — fetched server-side from Firestore `research_articles` collection
 *     via the admin-SDK src/lib/research.ts module (mirrors the news.ts pattern).
 *     Cards link to existing /research/[id] marketing routes.
 *
 *  2. Glossary — static list from src/data/glossaryData.ts (147 terms sourced
 *     from the CRA project). Client-side text filter. The CRA project had the
 *     canonical full list; this repo ships it verbatim.
 *
 * NOTE: The marketing-site ResearchGrid (src/components/ResearchGrid.tsx) uses
 * the client-side Firebase SDK. This page uses the admin SDK via research.ts so
 * the research fetch happens server-side and no Firebase client bundle is added.
 */

import type { Metadata } from 'next';
import { getPublishedResearch } from '@/lib/research';
import WorldEducationClient from './WorldEducationClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Education — Kumami World',
  description: 'Research articles and crypto glossary for Kumami World members.',
};

export default async function WorldEducationPage() {
  const articles = await getPublishedResearch(30);

  return (
    <div className="w-content-inner">
      <header style={{ marginBottom: '24px' }}>
        <h1 className="w-page-title">Education</h1>
        <p className="w-page-sub">
          Research articles and crypto glossary — all in one place.
        </p>
      </header>

      <WorldEducationClient initialArticles={articles} />
    </div>
  );
}
