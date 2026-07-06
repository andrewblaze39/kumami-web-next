import type { Metadata } from 'next';
import { getPublishedNews } from '@/lib/news';
import CategoryChips from '@/components/world/news/CategoryChips';
import NewsHero from '@/components/world/news/NewsHero';
import { HeadlineCard, LatestCard, NewsEmptyState } from '@/components/world/news/NewsList';

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

export default async function WorldNewsPage({ searchParams }: PageProps) {
  const { category } = await searchParams;
  const activeCategory = category || 'All';

  // Fetch published articles — returns [] gracefully if Firestore unavailable
  const articles = await getPublishedNews({
    category: activeCategory === 'All' ? undefined : activeCategory,
    limit: 40,
  });

  const hero = articles[0];
  // Main list: articles 1–12 (left 2-col dense list)
  const mainList = articles.slice(1, 13);
  // Latest rail: articles 13–22 (right sidebar)
  const latestRail = articles.slice(13, 23);

  return (
    <div className="w-content-inner">
      {/* Page header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 className="w-page-title" style={{ marginBottom: '4px' }}>
          News Portal
        </h1>
        <p className="w-page-sub">
          Latest crypto, Web3 &amp; finance news — live.
        </p>
      </div>

      {/* Category filter chips */}
      <CategoryChips active={activeCategory} />

      {articles.length === 0 ? (
        <NewsEmptyState category={activeCategory} />
      ) : (
        <>
          {/* Hero story */}
          {hero && <NewsHero article={hero} />}

          {/* 2-col layout: dense headline list + latest rail */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '28px',
            }}
            className="w-news-grid"
          >
            {/* Left: dense headline list */}
            {mainList.length > 0 && (
              <div>
                <h3
                  style={{
                    margin: '0 0 4px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--muted-2)',
                  }}
                >
                  Headlines
                </h3>
                <div>
                  {mainList.map((article) => (
                    <HeadlineCard key={article.id} article={article} />
                  ))}
                </div>
              </div>
            )}

            {/* Right: Latest rail */}
            {latestRail.length > 0 && (
              <div>
                <h3
                  style={{
                    margin: '0 0 10px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--muted-2)',
                  }}
                >
                  Latest
                </h3>
                <div>
                  {latestRail.map((article) => (
                    <LatestCard key={article.id} article={article} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
