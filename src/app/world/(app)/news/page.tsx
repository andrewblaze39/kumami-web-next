import type { Metadata } from 'next';
import Link from 'next/link';
import { Newspaper, Zap } from 'lucide-react';
import { getPublishedNews, getNewsCategories } from '@/lib/news';
import CategoryChips from '@/components/world/news/CategoryChips';
import NewsHero from '@/components/world/news/NewsHero';
import NewsTicker from '@/components/world/news/NewsTicker';
import ProGate from '@/components/world/news/ProGate';
import { NewsRow, NewsEmptyState } from '@/components/world/news/NewsList';
import AdvancedUpsell from '@/components/world/news/AdvancedUpsell';
import type { NewsArticle } from '@/lib/news';

// Force dynamic so Firestore is read at request-time, not build-time.
// (Firebase Admin SDK needs runtime env vars.)
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const { category } = await searchParams;
  const title = category
    ? `${category} News — Kumami World`
    : 'News — Kumami World';
  const description =
    'Crypto, Web3 & finance news curated for Kumami World members.';
  return {
    title,
    description,
    openGraph: { title, description, url: 'https://kumami.world/world/news' },
  };
}

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

function isProArticle(article: NewsArticle): boolean {
  return Boolean(article.isPro || article.isPremium);
}

export default async function WorldNewsPage({ searchParams }: PageProps) {
  const { category } = await searchParams;
  const activeCategory = category || 'All';

  // 'Most Popular' behaves as latest-ordering for now.
  // popularity metric TBD — latest for now
  const isRealCategoryFilter =
    activeCategory !== 'All' && activeCategory !== 'Most Popular';

  // Unfiltered latest page — always fetched so capsules reflect real articles
  // even while a category filter is active. When no filter is applied the
  // same fetch doubles as the display list (single query).
  const latest = await getPublishedNews({ limit: 40 });
  const articles = isRealCategoryFilter
    ? await getPublishedNews({ category: activeCategory, limit: 40 })
    : latest;

  // Capsules derived from real article data — never hardcoded.
  const categories = getNewsCategories(latest);

  const hero = articles[0];
  const asideList = articles.slice(1, 5);
  const river = articles.slice(5, 15);

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="w-content-inner">
      {/* Page header */}
      <div className="w-np-top">
        <h1>
          <Newspaper size={16} className="w-np-top-ico" />
          News
        </h1>
        <span className="w-np-date">{dateLabel} · Updated live</span>
      </div>

      {/* Crypto ticker */}
      <NewsTicker />

      {/* Category capsules — derived from real articles */}
      <CategoryChips active={activeCategory} categories={categories} />

      {articles.length === 0 ? (
        <NewsEmptyState category={activeCategory} />
      ) : (
        <>
          {/* Main grid: hero lead + latest aside */}
          <div className="w-np-grid">
            {hero && (
              <ProGate locked={isProArticle(hero)}>
                <NewsHero article={hero} />
              </ProGate>
            )}

            {asideList.length > 0 && (
              <aside className="w-np-aside">
                <div className="w-np-aside-h">
                  <Zap size={16} className="w-np-top-ico" />
                  LATEST
                </div>
                {asideList.map((article) => (
                  <ProGate key={article.id} locked={isProArticle(article)}>
                    <NewsRow article={article} />
                  </ProGate>
                ))}
              </aside>
            )}
          </div>

          {/* Advanced-mode upsell banner */}
          <AdvancedUpsell />

          {/* River — remaining articles */}
          {river.length > 0 && (
            <div className="w-np-river">
              <div className="w-np-aside-h">
                <Newspaper size={16} className="w-np-top-ico" />
                MORE NEWS
              </div>
              <div className="w-np-river-grid">
                {river.map((article) => (
                  <ProGate key={article.id} locked={isProArticle(article)}>
                    <NewsRow article={article} />
                  </ProGate>
                ))}
              </div>
            </div>
          )}

          {/* Archive entry point */}
          <div style={{ marginTop: '28px', textAlign: 'center' }}>
            <Link
              href="/world/news/all"
              style={{
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--accent)',
                textDecoration: 'none',
                padding: '10px 22px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--panel-2)',
                transition: 'background 0.14s',
              }}
            >
              View all news →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
