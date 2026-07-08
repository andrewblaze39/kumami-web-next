import Link from 'next/link';
import type { NewsArticle } from '@/lib/news';
import { AdvancedBadge, ProBadge } from './TierBadge';
import { formatRelativeTime, FALLBACK_THUMB_GRADIENT } from './NewsList';

interface NewsHeroProps {
  article: NewsArticle;
}

/** Lead story card — `.w-np-lead` (photo header + body). */
export default function NewsHero({ article }: NewsHeroProps) {
  const timeLabel = formatRelativeTime(article);
  const isProTier = article.isPro || article.isPremium;
  const isAdvancedTier = article.isAdvanced;

  const phBackground = article.imageUrl
    ? `linear-gradient(180deg, rgba(6,6,9,0) 35%, rgba(6,6,9,.92)), url(${JSON.stringify(article.imageUrl)})`
    : `linear-gradient(180deg, rgba(6,6,9,0) 35%, rgba(6,6,9,.92)), ${FALLBACK_THUMB_GRADIENT}`;

  return (
    <Link href={`/world/news/${article.id}`} className="w-np-lead">
      <div
        className="w-np-lead-ph"
        style={{ backgroundImage: phBackground }}
      >
        {(isAdvancedTier || isProTier) && (
          <div className="w-np-lead-badges">
            {isAdvancedTier && <AdvancedBadge />}
            {isProTier && <ProBadge link={false} />}
          </div>
        )}
        <h2>{article.title}</h2>
      </div>

      <div className="w-np-lead-body">
        {(article.excerpt || article.summary) && (
          <p className="w-np-lead-excerpt">{article.excerpt || article.summary}</p>
        )}
        <div className="w-np-meta">
          {article.category && (
            <span className="w-np-kicker">{article.category}</span>
          )}
          {article.source && <span>{article.source}</span>}
          {timeLabel && <span>{timeLabel}</span>}
        </div>
      </div>
    </Link>
  );
}
