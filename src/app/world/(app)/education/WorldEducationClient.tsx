'use client';

/**
 * WorldEducationClient — client component for the /world/education page.
 *
 * Renders two sections:
 *   1. Research card grid (server-fetched articles passed as props)
 *   2. Glossary with client-side text filter
 *
 * Uses world.css tokens only — no marketing-site CSS imported.
 */

import { useState, useMemo } from 'react';
import type { ResearchArticle } from '@/lib/research';
import { glossaryTerms } from '@/data/glossaryData';

// ---------- Research Section ----------

interface ResearchCardProps {
  article: ResearchArticle;
}

function ResearchCard({ article }: ResearchCardProps) {
  return (
    <a
      href={`/research/${article.id}`}
      className="w-edu-research-card"
    >
      <div className="w-edu-research-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.imageUrl}
          alt={article.title}
          loading="lazy"
          className="w-edu-research-img"
        />
      </div>
      <div className="w-edu-research-body">
        <span className="w-edu-research-cat">{article.category}</span>
        <h3 className="w-edu-research-title">{article.title}</h3>
        <p className="w-edu-research-desc">{article.description}</p>
      </div>
    </a>
  );
}

function ResearchSkeleton() {
  return (
    <div className="w-edu-research-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-edu-research-card w-edu-skeleton-card">
          <div className="w-edu-research-thumb w-skeleton" />
          <div className="w-edu-research-body">
            <div className="w-skeleton w-skeleton-title" style={{ width: '30%', height: '12px', marginBottom: '8px' }} />
            <div className="w-skeleton w-skeleton-title" style={{ width: '80%', marginBottom: '8px' }} />
            <div className="w-skeleton w-skeleton-body" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ResearchSection({ articles }: { articles: ResearchArticle[] }) {
  if (articles.length === 0) {
    return (
      <div className="w-edu-empty">
        <p>No research articles published yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="w-edu-research-grid">
      {articles.map((article) => (
        <ResearchCard key={article.id} article={article} />
      ))}
    </div>
  );
}

// ---------- Glossary Section ----------

function GlossarySection() {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return glossaryTerms;
    return glossaryTerms.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }, [filter]);

  return (
    <div className="w-edu-glossary">
      {/* Filter input */}
      <div className="w-edu-glossary-search">
        <svg
          className="w-edu-glossary-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search terms..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-edu-glossary-input"
          aria-label="Filter glossary terms"
        />
        {filter && (
          <button
            className="w-edu-glossary-clear"
            onClick={() => setFilter('')}
            aria-label="Clear filter"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" width="14" height="14">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="w-edu-glossary-count">
        {filtered.length} term{filtered.length !== 1 ? 's' : ''}
        {filter ? ` matching "${filter}"` : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="w-edu-empty">
          <p>No terms found for &quot;{filter}&quot;.</p>
          <button className="w-btn w-btn-ghost w-btn-sm" onClick={() => setFilter('')}>
            Clear filter
          </button>
        </div>
      ) : (
        <div className="w-edu-glossary-grid">
          {filtered.map((term) => (
            <div key={term.id} className="w-edu-glossary-card">
              <div className="w-edu-glossary-card-head">
                <span className="w-edu-glossary-term">{term.term}</span>
                <span className="w-edu-glossary-cat">{term.category}</span>
              </div>
              <p className="w-edu-glossary-def">{term.definition}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Section wrapper ----------

function EduSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-edu-section">
      <div className="w-edu-section-head">
        <h2 className="w-edu-section-title">{title}</h2>
        {subtitle && <p className="w-edu-section-sub">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// ---------- Main client component ----------

interface WorldEducationClientProps {
  initialArticles: ResearchArticle[];
}

export default function WorldEducationClient({
  initialArticles,
}: WorldEducationClientProps) {
  return (
    <div className="w-edu-root">
      <EduSection
        title="Research"
        subtitle="In-depth analysis and project deep-dives."
      >
        <ResearchSection articles={initialArticles} />
      </EduSection>

      <EduSection
        title="Glossary"
        subtitle="147 crypto and Web3 terms — from Alpha to Zero-knowledge."
      >
        <GlossarySection />
      </EduSection>
    </div>
  );
}
