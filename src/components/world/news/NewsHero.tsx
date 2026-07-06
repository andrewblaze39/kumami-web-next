import Link from 'next/link';
import type { NewsArticle } from '@/lib/news';
import { timestampToDate, resolveTimestamp } from '@/lib/news';
import { AdvancedBadge, ProBadge } from './TierBadge';

function formatRelativeTime(article: NewsArticle): string {
  const ts = resolveTimestamp(article);
  const date = timestampToDate(ts);
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
  });
}

interface NewsHeroProps {
  article: NewsArticle;
}

export default function NewsHero({ article }: NewsHeroProps) {
  const timeLabel = formatRelativeTime(article);
  const isProTier = article.isPro || article.isPremium;
  const isAdvancedTier = article.isAdvanced;
  const href = `/world/news/${article.id}`;

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '18px',
        overflow: 'hidden',
        border: '1px solid var(--border-2)',
        background: 'var(--panel)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.18s, box-shadow 0.18s',
        marginBottom: '24px',
        position: 'relative',
      }}
      className="w-news-hero-link"
    >
      {/* Hero image */}
      {article.imageUrl && (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/7',
            overflow: 'hidden',
            background: 'var(--panel-2)',
            position: 'relative',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageUrl}
            alt={article.title ?? 'News hero'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Gradient overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to top, rgba(10,20,17,0.82) 0%, rgba(10,20,17,0.18) 55%, transparent 100%)',
            }}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '18px 22px 20px' }}>
        {/* Category + tier badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {article.category && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--accent2)',
                opacity: 0.9,
              }}
            >
              {article.category}
            </span>
          )}
          {isAdvancedTier && <AdvancedBadge articleId={article.id} />}
          {isProTier && <ProBadge />}
        </div>

        {/* Title */}
        <h2
          style={{
            margin: '0 0 10px',
            fontSize: 'clamp(18px, 2.4vw, 26px)',
            fontWeight: 800,
            lineHeight: 1.22,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          {article.title}
        </h2>

        {/* Excerpt */}
        {(article.excerpt || article.summary) && (
          <p
            style={{
              margin: '0 0 14px',
              fontSize: '14px',
              color: 'var(--muted)',
              lineHeight: 1.6,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {article.excerpt || article.summary}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {article.source && (
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
              {article.source}
            </span>
          )}
          {article.author && (
            <span style={{ fontSize: '12px', color: 'var(--muted-2)' }}>
              {article.author}
            </span>
          )}
          {timeLabel && (
            <span style={{ fontSize: '11px', color: 'var(--muted-2)', marginLeft: 'auto' }}>
              {timeLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
