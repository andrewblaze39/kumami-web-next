import Link from 'next/link';
import type { NewsArticle } from '@/lib/news';
import { timestampToDate, resolveTimestamp } from '@/lib/news';
import { AdvancedBadge, ProBadge } from './TierBadge';

/** Fallback gradient used where an article has no imageUrl. */
export const FALLBACK_THUMB_GRADIENT =
  'linear-gradient(130deg, #0d2b2c, #0d201b)';

export function formatRelativeTime(article: NewsArticle): string {
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

// ---------- Article row (aside + river) ----------

interface NewsRowProps {
  article: NewsArticle;
}

/** Thumb + body article row — `.w-np-row`. */
export function NewsRow({ article }: NewsRowProps) {
  const timeLabel = formatRelativeTime(article);
  const isProTier = article.isPro || article.isPremium;
  const isAdvancedTier = article.isAdvanced;

  const thumbBackground = article.imageUrl
    ? `url(${JSON.stringify(article.imageUrl)})`
    : FALLBACK_THUMB_GRADIENT;

  return (
    <Link href={`/world/news/${article.id}`} className="w-np-row">
      <div
        className="w-np-thumb"
        style={{ backgroundImage: thumbBackground }}
        role="img"
        aria-label={article.title ?? ''}
      >
        {(isAdvancedTier || isProTier) && (
          <span className="w-np-thumb-badge">
            {isProTier ? <ProBadge link={false} /> : <AdvancedBadge />}
          </span>
        )}
      </div>

      <div className="w-np-row-body">
        {article.category && (
          <span className="w-np-kicker">{article.category}</span>
        )}
        <h3>{article.title}</h3>
        <div className="w-np-meta">
          {article.source && <span>{article.source}</span>}
          {timeLabel && <span>{timeLabel}</span>}
        </div>
      </div>
    </Link>
  );
}

// ---------- "Latest" rail card (used by the article detail page) ----------

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
