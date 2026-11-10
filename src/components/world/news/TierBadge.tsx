import Link from 'next/link';
import { Lock } from 'lucide-react';

interface AdvancedBadgeProps {
  /** When provided, badge links to /world/intel/[id]. Omit inside card links (avoids nested anchors). */
  articleId?: string;
}

/**
 * Former gold "PLUS" tier badge. Since v1.18 Plus is part of the free Basic
 * workspace (Rachelle v1.17 "Shell and workspaces"), so these articles carry no
 * tier badge; only PRO-flagged articles keep theirs (the upsell).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AdvancedBadge(_props: AdvancedBadgeProps) {
  return null;
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
