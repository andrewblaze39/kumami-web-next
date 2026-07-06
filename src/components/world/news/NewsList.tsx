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

// ---------- Dense headline card (left 2-col) ----------

interface HeadlineCardProps {
  article: NewsArticle;
}

export function HeadlineCard({ article }: HeadlineCardProps) {
  const timeLabel = formatRelativeTime(article);
  const isProTier = article.isPro || article.isPremium;
  const isAdvancedTier = article.isAdvanced;

  return (
    <Link
      href={`/world/news/${article.id}`}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        textDecoration: 'none',
        color: 'inherit',
        alignItems: 'flex-start',
        transition: 'opacity 0.14s',
      }}
      className="w-headline-card"
    >
      {/* Thumbnail */}
      {article.imageUrl && (
        <div
          style={{
            flexShrink: 0,
            width: '80px',
            height: '58px',
            borderRadius: '10px',
            overflow: 'hidden',
            background: 'var(--panel-2)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageUrl}
            alt={article.title ?? ''}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Badges */}
        {(isAdvancedTier || isProTier) && (
          <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
            {isAdvancedTier && <AdvancedBadge articleId={article.id} />}
            {isProTier && <ProBadge />}
          </div>
        )}

        <h4
          style={{
            margin: '0 0 5px',
            fontSize: '13.5px',
            fontWeight: 700,
            lineHeight: 1.35,
            letterSpacing: '-0.01em',
            color: 'var(--ink)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {article.title}
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {article.category && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                color: 'var(--accent)',
                opacity: 0.8,
              }}
            >
              {article.category}
            </span>
          )}
          {timeLabel && (
            <span style={{ fontSize: '11px', color: 'var(--muted-2)' }}>
              {timeLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ---------- "Latest" rail card (right sidebar) ----------

interface LatestCardProps {
  article: NewsArticle;
}

export function LatestCard({ article }: LatestCardProps) {
  const timeLabel = formatRelativeTime(article);

  return (
    <Link
      href={`/world/news/${article.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '12px',
        borderRadius: '12px',
        background: 'var(--panel-2)',
        border: '1px solid var(--border)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 0.14s, border-color 0.14s',
        marginBottom: '8px',
      }}
      className="w-latest-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {article.category && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent2)',
            }}
          >
            {article.category}
          </span>
        )}
        <span style={{ fontSize: '10px', color: 'var(--muted-2)', marginLeft: 'auto' }}>
          {timeLabel}
        </span>
      </div>
      <span
        style={{
          fontSize: '12.5px',
          fontWeight: 700,
          lineHeight: 1.4,
          color: 'var(--ink)',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {article.title}
      </span>
    </Link>
  );
}

// ---------- Empty state ----------

export function NewsEmptyState({ category }: { category?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
        borderRadius: '18px',
        border: '1px solid var(--border)',
        background: 'var(--panel)',
        gap: '12px',
      }}
    >
      <div style={{ fontSize: '36px', opacity: 0.3 }}>📰</div>
      <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
        {category && category !== 'All' ? `No ${category} articles yet` : 'No articles yet'}
      </p>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
        Check back soon — new content is published regularly.
      </p>
    </div>
  );
}
