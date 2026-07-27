/**
 * /world/glossary/[id] — Glossary term "deep dive" (server component).
 *
 * Renders a single term from glossaryData: name, category, definition, plus a
 * scaffold for richer deep-dive content (related terms / linked news) to be
 * authored later. Terms are linked here from the Glossary tab's alphabet grid.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { glossaryTerms } from '@/data/glossaryData';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const term = glossaryTerms.find(t => t.id === id);
  if (!term) return { title: 'Term not found — Kumami World' };
  return {
    title: `${term.term} — Glossary · Kumami World`,
    description: term.definition,
  };
}

export default async function GlossaryTermPage({ params }: Props) {
  const { id } = await params;
  const term = glossaryTerms.find(t => t.id === id);
  if (!term) notFound();

  // Related terms: same category, excluding this one (up to 6).
  const related = glossaryTerms
    .filter(t => t.category === term.category && t.id !== term.id)
    .slice(0, 6);

  return (
    <div className="w-content-inner">
      <article className="w-gloss-detail">
        <nav className="w-reader-breadcrumb" aria-label="Breadcrumb">
          <Link href="/world/education?tab=glossary" className="w-reader-breadcrumb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Glossary
          </Link>
        </nav>

        <header className="w-gloss-detail-head">
          <span className="w-gloss-detail-cat">{term.category}</span>
          <h1 className="w-gloss-detail-title">{term.term}</h1>
        </header>

        <p className="w-gloss-detail-def">{term.definition}</p>

        {related.length > 0 && (
          <section className="w-gloss-detail-related">
            <h2 className="w-gloss-detail-related-title">Related terms</h2>
            <div className="w-gloss-detail-related-grid">
              {related.map(t => (
                <Link key={t.id} href={`/world/glossary/${t.id}`} className="w-gloss-detail-related-chip">
                  {t.term}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
