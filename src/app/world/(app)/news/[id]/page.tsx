import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getNewsById, getPublishedNews, timestampToDate, resolveTimestamp } from '@/lib/news';
import { LatestCard } from '@/components/world/news/NewsList';
import { AdvancedBadge, ProBadge } from '@/components/world/news/TierBadge';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------- Markdown renderer (mirrored from NewsArticleView; no new deps) ----------

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_(?!\s)([^_\n]+?)_(?!_)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
      const safeHref = href.replace(/"/g, '&quot;');
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="color:var(--accent2);text-decoration:underline">${label}</a>`;
    });
}

function renderMarkdown(text: string | undefined): string {
  if (!text) return '';
  const normalized = text
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const blocks = normalized.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n');
      const isBulletBlock = lines.every(
        (l) => /^\s*[-*•]\s+/.test(l) || l.trim() === ''
      );
      if (isBulletBlock && lines.some((l) => /^\s*[-*•]\s+/.test(l))) {
        const items = lines
          .filter((l) => /^\s*[-*•]\s+/.test(l))
          .map(
            (l) =>
              `<li style="margin-bottom:4px">${parseInline(
                escapeHtml(l.replace(/^\s*[-*•]\s+/, ''))
              )}</li>`
          )
          .join('');
        return `<ul style="list-style:disc;padding-left:20px;margin:12px 0">${items}</ul>`;
      }

      const heading = block.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        const body = parseInline(escapeHtml(heading[2]));
        const size = level <= 2 ? '22px' : level === 3 ? '18px' : '15px';
        const weight = level <= 3 ? 800 : 700;
        return `<h${level} style="font-size:${size};font-weight:${weight};margin:28px 0 10px;letter-spacing:-0.02em;color:var(--ink)">${body}</h${level}>`;
      }

      return `<p style="margin-bottom:16px;line-height:1.72;color:rgba(241,247,244,0.85)">${parseInline(
        escapeHtml(block).replace(/\n/g, '<br />')
      )}</p>`;
    })
    .join('');
}

// ---------- Metadata ----------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getNewsById(id);

  const fallbackTitle = 'Kumami News — Crypto & Web3';
  const fallbackDesc = 'Read the latest crypto and Web3 news on Kumami World.';

  if (!article) {
    return { title: fallbackTitle, description: fallbackDesc };
  }

  const title = article.title ? `${article.title} — Kumami World` : fallbackTitle;
  const rawDesc =
    article.summary ||
    article.excerpt ||
    fallbackDesc;
  const description =
    rawDesc.length > 160 ? `${rawDesc.substring(0, 157)}...` : rawDesc;

  const ts = resolveTimestamp(article);
  const date = timestampToDate(ts);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://kumami.world/world/news/${id}`,
      type: 'article',
      ...(date && { publishedTime: date.toISOString() }),
      ...(article.author && { authors: [article.author] }),
      images: article.imageUrl
        ? [{ url: article.imageUrl, width: 1200, height: 630, alt: article.title || 'Kumami News' }]
        : [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Kumami News' }],
    },
  };
}

// ---------- Page ----------

export default async function WorldNewsDetailPage({ params }: PageProps) {
  const { id } = await params;
  const article = await getNewsById(id);

  if (!article) notFound();

  const ts = resolveTimestamp(article);
  const date = timestampToDate(ts);
  const formattedDate = date
    ? date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const isProTier = article.isPro || article.isPremium;
  const isAdvancedTier = article.isAdvanced;
  const bodyHtml = renderMarkdown(article.content);

  // Fetch related articles for the sidebar
  const relatedArticles = await getPublishedNews({ limit: 8 });
  const related = relatedArticles.filter((a) => a.id !== id).slice(0, 5);

  return (
    <div className="w-content-inner">
      {/* Breadcrumb */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12.5px',
          color: 'var(--muted)',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/world/news"
          style={{ color: 'var(--muted)', textDecoration: 'none' }}
        >
          News
        </Link>
        <ChevronRight size={13} strokeWidth={2.5} />
        {article.category && (
          <>
            <Link
              href={`/world/news?category=${encodeURIComponent(article.category)}`}
              style={{ color: 'var(--muted)', textDecoration: 'none' }}
            >
              {article.category}
            </Link>
            <ChevronRight size={13} strokeWidth={2.5} />
          </>
        )}
        <span
          style={{
            color: 'var(--ink)',
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '240px',
          }}
        >
          {article.title}
        </span>
      </nav>

      {/* Two-column: article + related sidebar */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}
        className="w-article-grid"
      >
        {/* ── Main article ── */}
        <article>
          {/* Hero image */}
          {article.imageUrl && (
            <div
              style={{
                width: '100%',
                maxWidth: '680px',
                marginBottom: '24px',
                borderRadius: '14px',
                overflow: 'hidden',
                background: 'var(--panel-2)',
                aspectRatio: '16/9',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt={article.title ?? 'Article cover'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Meta */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            {article.category && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--accent2)',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-2)',
                  background: 'var(--panel-2)',
                }}
              >
                {article.category}
              </span>
            )}
            {isAdvancedTier && <AdvancedBadge articleId={article.id} />}
            {isProTier && <ProBadge />}
            {formattedDate && (
              <time style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {formattedDate}
              </time>
            )}
            {article.author && (
              <span style={{ fontSize: '12px', color: 'var(--muted-2)' }}>
                By {article.author}
              </span>
            )}
          </div>

          {/* Title */}
          <h1
            style={{
              margin: '0 0 16px',
              fontSize: 'clamp(22px, 3.5vw, 34px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.18,
              color: 'var(--ink)',
            }}
          >
            {article.title}
          </h1>

          {/* Summary / pull-quote */}
          {article.summary && (
            <p
              style={{
                fontSize: '16px',
                color: 'var(--muted)',
                lineHeight: 1.65,
                marginBottom: '24px',
                borderLeft: '3px solid var(--accent)',
                paddingLeft: '14px',
                fontStyle: 'italic',
              }}
            >
              {article.summary}
            </p>
          )}

          {/* PRO gate overlay on body */}
          {isProTier ? (
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  filter: 'blur(4px)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  maxHeight: '180px',
                  overflow: 'hidden',
                  opacity: 0.5,
                }}
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    'linear-gradient(to bottom, transparent 0%, rgba(10,20,17,0.92) 40%)',
                  borderRadius: '12px',
                  gap: '12px',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontWeight: 800,
                    fontSize: '18px',
                    color: 'var(--gold)',
                  }}
                >
                  PRO Article
                </p>
                <p
                  style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}
                >
                  Upgrade to read the full story.
                </p>
                <Link
                  href="/world/pro"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '10px 20px',
                    borderRadius: '999px',
                    background: 'var(--gold)',
                    color: '#06241a',
                    fontWeight: 800,
                    fontSize: '13px',
                    textDecoration: 'none',
                  }}
                >
                  Upgrade to PRO
                </Link>
              </div>
            </div>
          ) : (
            /* Article body */
            <div
              style={{ fontSize: '15px', lineHeight: 1.75, maxWidth: '680px' }}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}

          {/* ── Kumami Insight placeholder block ── */}
          <div
            style={{
              marginTop: '36px',
              borderRadius: '16px',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #0c2119 0%, #081510 100%)',
              border: '1px solid rgba(94,233,168,0.22)',
              boxShadow: '0 0 32px rgba(94,233,168,0.06)',
              position: 'relative',
            }}
          >
            {/* Glow orb */}
            <div
              style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 140,
                height: 140,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(94,233,168,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                borderBottom: '1px solid rgba(94,233,168,0.12)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 3C9.5 6 5 7.5 5 12a7 7 0 0 0 14 0c0-1.5-.6-2.7-1.4-3.6-.3 1-.9 1.6-1.6 1.6 0-3-1-5-1-7Z"
                    fill="#081510"
                  />
                  <circle cx="9" cy="13" r="1.2" fill="#081510" />
                  <circle cx="15" cy="13" r="1.2" fill="#081510" />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: 'var(--accent)',
                    lineHeight: 1,
                  }}
                >
                  Kumami Insight
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted-2)', marginTop: 2 }}>
                  Analysis by Kumami Intelligence
                </div>
              </div>
              <div
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'rgba(94,233,168,0.08)',
                  border: '1px solid rgba(94,233,168,0.18)',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    boxShadow: '0 0 6px var(--accent)',
                  }}
                />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 18px' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '13.5px',
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                  fontStyle: 'italic',
                }}
              >
                The Kumami Intelligence pipeline will surface market context, sentiment signals,
                and on-chain perspective for this article automatically. Stay tuned.
              </p>
            </div>
          </div>
        </article>

        {/* ── Related sidebar ── */}
        {related.length > 0 && (
          <aside>
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted-2)',
              }}
            >
              More News
            </h3>
            {related.map((a) => (
              <LatestCard key={a.id} article={a} />
            ))}
            <Link
              href="/world/news"
              style={{
                display: 'block',
                marginTop: '10px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--accent)',
                textDecoration: 'none',
                textAlign: 'center',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--panel-2)',
                transition: 'background 0.14s',
              }}
            >
              View all news →
            </Link>
          </aside>
        )}
      </div>

      <style>{`
        @media (min-width: 900px) {
          .w-article-grid {
            grid-template-columns: 1fr 280px !important;
          }
        }
      `}</style>
    </div>
  );
}
