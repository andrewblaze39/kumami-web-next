'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const CATEGORIES = [
  'All',
  'Macro',
  'Markets',
  'Regulation',
  'Security',
  'Trading',
  'Web3',
  'On-chain',
  'Learn',
];

interface CategoryChipsProps {
  /** Currently active category — 'All' or a category name */
  active?: string;
}

export default function CategoryChips({ active }: CategoryChipsProps) {
  // useSearchParams is only used for reading — parent passes active down via server props
  // We use Link so the filter is server-side via ?category= searchParam
  const current = active || 'All';

  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        marginBottom: '20px',
      }}
    >
      {CATEGORIES.map((cat) => {
        const isActive = cat === current || (cat === 'All' && current === 'All');
        const href =
          cat === 'All' ? '/world/news' : `/world/news?category=${encodeURIComponent(cat)}`;

        return (
          <Link
            key={cat}
            href={href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '5px 13px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              border: isActive
                ? '1px solid var(--accent)'
                : '1px solid var(--border-2)',
              background: isActive
                ? 'rgba(94,233,168,0.12)'
                : 'var(--panel-2)',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {cat}
          </Link>
        );
      })}
    </div>
  );
}
