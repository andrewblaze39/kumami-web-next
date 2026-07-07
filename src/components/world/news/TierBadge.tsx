import Link from 'next/link';
import { Lock } from 'lucide-react';

interface AdvancedBadgeProps {
  /** When provided, badge links to /world/intel/[id]. Omit inside card links (avoids nested anchors). */
  articleId?: string;
}

/** Gold "ADVANCED" tier badge — optionally deep-links to /world/intel/[id] */
export function AdvancedBadge({ articleId }: AdvancedBadgeProps) {
  const inner = <span className="w-tag-badge w-tag-adv">Advanced</span>;

  if (articleId) {
    return (
      <Link href={`/world/intel/${articleId}`} style={{ textDecoration: 'none' }}>
        {inner}
      </Link>
    );
  }
  return inner;
}

interface ProBadgeProps {
  /** Render as a link to /world/pro (default). Pass false inside card links (avoids nested anchors). */
  link?: boolean;
}

/** Purple "PRO" tier badge — gates to /world/pro */
export function ProBadge({ link = true }: ProBadgeProps) {
  const inner = (
    <span className="w-tag-badge w-tag-pro">
      <Lock size={9} strokeWidth={2.5} />
      PRO
    </span>
  );

  if (link) {
    return (
      <Link href="/world/pro" style={{ textDecoration: 'none' }}>
        {inner}
      </Link>
    );
  }
  return inner;
}
