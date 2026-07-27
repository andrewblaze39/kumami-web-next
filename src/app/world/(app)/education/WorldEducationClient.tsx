'use client';

/**
 * WorldEducationClient — Research + Glossary sections for the /world/education
 * page. Rendered as the "Research" and "Glossary" subtabs by EducationTabs.
 *
 *   1. Research card grid (server-fetched articles passed as props)
 *   2. Glossary with client-side text filter
 *
 * Uses world.css tokens only — no marketing-site CSS imported.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send, Globe } from 'lucide-react';
import type { ResearchArticle } from '@/lib/research';
import { XIcon, DiscordIcon } from '@/components/icons/BrandIcons';
import { glossaryTerms } from '@/data/glossaryData';

// ---------- Research Section ----------

interface ResearchCardProps {
  article: ResearchArticle;
}

function ResearchSocialLinks({ article }: { article: ResearchArticle }) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const btnClass =
    'flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.12] transition-all hover:bg-[#40e0d0]/[0.18] hover:-translate-y-[1px]';
  const iconClass = 'text-white/90';
  const links = [
    { href: article.twitterLink, label: 'Twitter / X', icon: <XIcon size={13} className={iconClass} /> },
    { href: article.discordLink, label: 'Discord', icon: <DiscordIcon size={13} className={iconClass} /> },
    { href: article.telegramLink, label: 'Telegram', icon: <Send size={13} className={iconClass} /> },
    { href: article.websiteLink, label: 'Website', icon: <Globe size={13} className={iconClass} /> },
  ].filter((l) => l.href);

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className={btnClass}
          onClick={stop}
          aria-label={l.label}
        >
          {l.icon}
        </a>
      ))}
    </div>
  );
}

function ResearchCard({ article }: ResearchCardProps) {
  const router = useRouter();
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/world/research/${article.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(`/world/research/${article.id}`);
      }}
      className="w-edu-research-card"
      style={{ cursor: 'pointer' }}
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
        <ResearchSocialLinks article={article} />
      </div>
    </div>
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

export function ResearchSection({ articles }: { articles: ResearchArticle[] }) {
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

const GLOSS_ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** First-letter bucket for a term — non-A–Z starts fall under '#'. */
function glossLetter(term: string): string {
  const c = term.trim()[0]?.toUpperCase() ?? '#';
  return c >= 'A' && c <= 'Z' ? c : '#';
}

export function GlossarySection() {
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

  // Group filtered terms by first letter, alphabetically sorted within each group.
  const groups = useMemo(() => {
    const map = new Map<string, typeof glossaryTerms>();
    for (const t of [...filtered].sort((a, b) => a.term.localeCompare(b.term))) {
      const l = glossLetter(t.term);
      if (!map.has(l)) map.set(l, []);
      map.get(l)!.push(t);
    }
    return map;
  }, [filtered]);

  // Jump to a letter section. The shell scrolls inside .w-main, so
  // scrollIntoView (which targets the nearest scrollable ancestor) is correct.
  const scrollToLetter = (l: string) => {
    document.getElementById(`gloss-${l}`)?.scrollIntoView({ block: 'start' });
  };

  return (
    <div className="w-edu-glossary">
      {/* Centered hero — enlarged, Stingray-style header + search */}
      <div className="w-gloss-hero">
        <h1 className="w-gloss-hero-title">Glossary</h1>
        <div className="w-edu-glossary-search w-gloss-hero-search">
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
      </div>

      {/* Alphabet index — click a letter to jump to its group */}
      <div className="w-gloss-alpha" role="navigation" aria-label="Jump to letter">
        {GLOSS_ALPHABET.map((l) => {
          const has = groups.has(l);
          return (
            <button
              key={l}
              type="button"
              className={`w-gloss-alpha-btn${has ? '' : ' disabled'}`}
              disabled={!has}
              onClick={() => scrollToLetter(l)}
              aria-label={`Jump to ${l}`}
            >
              {l}
            </button>
          );
        })}
      </div>

      {filter && (
        <p className="w-edu-glossary-count">
          {filtered.length} term{filtered.length !== 1 ? 's' : ''} matching &quot;{filter}&quot;
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="w-edu-empty">
          <p>No terms found for &quot;{filter}&quot;.</p>
          <button className="w-btn w-btn-ghost w-btn-sm" onClick={() => setFilter('')}>
            Clear filter
          </button>
        </div>
      ) : (
        GLOSS_ALPHABET.filter((l) => groups.has(l)).map((l) => (
          <section key={l} id={`gloss-${l}`} className="w-gloss-group">
            <h2 className="w-gloss-letter">{l}</h2>
            <div className="w-edu-glossary-grid">
              {groups.get(l)!.map((term) => (
                <Link
                  key={term.id}
                  href={`/world/glossary/${term.id}`}
                  className="w-edu-glossary-card w-gloss-card-link"
                >
                  <div className="w-edu-glossary-card-head">
                    <span className="w-edu-glossary-term">{term.term}</span>
                    <span className="w-edu-glossary-cat">{term.category}</span>
                  </div>
                  <p className="w-edu-glossary-def">{term.definition}</p>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

// ---------- Section wrapper ----------

export function EduSection({
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

// ---------- Subtab wrappers ----------

export function ResearchTab({ articles }: { articles: ResearchArticle[] }) {
  return (
    <div className="w-edu-root">
      <EduSection
        title="Research"
        subtitle="In-depth analysis and project deep-dives."
      >
        <ResearchSection articles={articles} />
      </EduSection>
    </div>
  );
}

export function GlossaryTab() {
  return (
    <div className="w-edu-root">
      <GlossarySection />
    </div>
  );
}
