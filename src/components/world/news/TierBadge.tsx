import Link from 'next/link';
import { Lock } from 'lucide-react';

interface TierBadgeProps {
  articleId?: string;
}

/** Mint-outline "Advanced" badge — links to /world/intel/[id] */
export function AdvancedBadge({ articleId }: TierBadgeProps) {
  const inner = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--accent)',
        border: '1px solid var(--accent)',
        background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
        lineHeight: 1.6,
        cursor: articleId ? 'pointer' : 'default',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      Advanced
    </span>
  );

  if (articleId) {
    return (
      <Link href={`/world/intel/${articleId}`} style={{ textDecoration: 'none' }}>
        {inner}
      </Link>
    );
  }
  return inner;
}

/** Gold + lock "PRO" badge — click gates to /world/pro */
export function ProBadge() {
  return (
    <Link
      href="/world/pro"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#06241a',
        background: 'var(--gold)',
        lineHeight: 1.6,
        cursor: 'pointer',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <Lock size={9} strokeWidth={2.5} />
      PRO
    </Link>
  );
}
